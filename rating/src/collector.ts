import assert from "node:assert";
import fs from "node:fs";
import process from "node:process";
import { chromium, type Page } from "playwright";

interface Player {
	id: string;
	nickname: string;
}

const PlayerCountToCollect = 500;

async function collectPlayers() {
	const browser = await chromium.launch({ headless: false });
	const page = await browser.newPage();

	const players: Player[] = [];

	while (players.length < PlayerCountToCollect) {
		console.log("Fetching a player list");

		await page.goto(`https://www.hltv.org/players?offset=${players.length}`);
		await sleep(250 + Math.random() * 750);

		const list = page.locator(".players-archive-grid");
		const links = await list.getByRole("link").all();

		if (links.length === 0) {
			console.log("No more players, breaking");
			break;
		}

		for (const link of links) {
			const href = await link.getAttribute("href");
			if (!href) continue;

			const path = href.split("/");
			players.push({ id: path[2], nickname: path[3] });
		}

		console.log(`Players collected so far: ${players.length}`);
	}

	await browser.close();
	savePlayers(players);
}

const PlayersCsv = "./data/players.csv";

function savePlayers(players: Player[]): void {
	const header = "id,nickname\n";
	const rows = players.map((p) => `${p.id},${p.nickname}`).join("\n");

	fs.writeFileSync(PlayersCsv, header + rows, "utf8");
}

function loadPlayers(): Player[] {
	return fs
		.readFileSync(PlayersCsv, "utf8")
		.split("\n")
		.slice(1)
		.map((line) => {
			const context = line.split(",");
			return { id: context[0], nickname: context[1] };
		});
}

interface Stats {
	rating: number;
	kast: number;
	impact: number;
	firepower: number;
	kpr: number;
	apr: number;
	dpr: number;
	kd: number;
	adr: number;
	"0kpr": number;
	"1kpr": number;
	"2kpr": number;
	"3kpr": number;
	"4kpr": number;
	"5kpr": number;
}

const XPaths = {
	ratingVersion: ".player-summary-stat-box-data-description-text.player-summary-stat-box-data-text",
	rating: ".player-summary-stat-box-rating-data-text",
	kast: "(//div[@class='player-summary-stat-box-data traditionalData'])[2]",
	kills: "(//div[@class='stats-row'])[1]/span[2]",
	deaths: "(//div[@class='stats-row'])[3]/span[2]",
	adr: "(//div[@class='stats-row'])[5]/span[2]",
	rounds: "(//div[@class='stats-row'])[8]/span[2]",
	apr: "(//div[@class='stats-row'])[10]/span[2]",
	impact: "(//div[@class='stats-row'])[14]/span[2]",
	firepower: "(//div[@class='row-stats-section-score'])[1]",
	zeroKillRounds: "(//div[@class='stats-row'])[13]/span[2]",
	oneKillRounds: "(//div[@class='stats-row'])[14]/span[2]",
	twoKillRounds: "(//div[@class='stats-row'])[15]/span[2]",
	threeKillRounds: "(//div[@class='stats-row'])[16]/span[2]",
	fourKillRounds: "(//div[@class='stats-row'])[17]/span[2]",
	fiveKillRounds: "(//div[@class='stats-row'])[18]/span[2]",
};

async function collectStats() {
	const browser = await chromium.launch({ headless: false });
	const page = await browser.newPage();

	const stats: Stats[] = [];
	const players = loadPlayers();

	for (const [index, player] of players.entries()) {
		console.log(`Fetching stats for ${player.nickname}, ${index + 1}/${players.length}`);

		const query = `startDate=2017-06-14&endDate=${formatDate(new Date())}`;
		await goto(page, `https://www.hltv.org/stats/players/${player.id}/${player.nickname}?${query}`);

		const [rating, kast, kills, deaths, adr, rounds, apr, impact, firepower] = await Promise.all([
			xpathNumber(page, XPaths.rating),
			xpathNumber(page, XPaths.kast),
			xpathNumber(page, XPaths.kills),
			xpathNumber(page, XPaths.deaths),
			xpathNumber(page, XPaths.adr),
			xpathNumber(page, XPaths.rounds),
			xpathNumber(page, XPaths.apr),
			xpathNumber(page, XPaths.impact),
			xpathNumber(page, XPaths.firepower),
		]);

		await goto(
			page,
			`https://www.hltv.org/stats/players/individual/${player.id}/${player.nickname}?${query}`,
		);

		const [
			zeroKillRounds,
			oneKillRounds,
			twoKillRounds,
			threeKillRounds,
			fourKillRounds,
			fiveKillRounds,
		] = await Promise.all([
			xpathNumber(page, XPaths.zeroKillRounds),
			xpathNumber(page, XPaths.oneKillRounds),
			xpathNumber(page, XPaths.twoKillRounds),
			xpathNumber(page, XPaths.threeKillRounds),
			xpathNumber(page, XPaths.fourKillRounds),
			xpathNumber(page, XPaths.fiveKillRounds),
		]);

		stats.push({
			rating,
			kast,
			impact,
			firepower,
			kpr: kills / rounds,
			apr,
			dpr: deaths / rounds,
			kd: kills / deaths,
			adr,
			"0kpr": zeroKillRounds / rounds,
			"1kpr": oneKillRounds / rounds,
			"2kpr": twoKillRounds / rounds,
			"3kpr": threeKillRounds / rounds,
			"4kpr": fourKillRounds / rounds,
			"5kpr": fiveKillRounds / rounds,
		});
	}

	await browser.close();
	saveStats(stats);
}

const StatsCsv = "./data/stats.csv";

function saveStats(stats: Stats[]) {
	const header = "rating,kast,impact,firepower,kpr,apr,dpr,kd,adr,0kpr,1kpr,2kpr,3kpr,4kpr,5kpr\n";
	const rows = stats
		.map(
			(x) =>
				`${x.rating},${x.kast},${x.impact},${x.firepower},${x.kpr},${x.apr},${x.dpr},${x.kd},${x.adr},${x["0kpr"]},${x["1kpr"]},${x["2kpr"]},${x["3kpr"]},${x["4kpr"]},${x["5kpr"]}`,
		)
		.join("\n");

	fs.writeFileSync(StatsCsv, header + rows, "utf8");
}

async function xpathText(page: Page, xpath: string): Promise<string> {
	const text = await page.locator(xpath).textContent();
	assert(text);
	return text;
}

async function xpathNumber(page: Page, xpath: string): Promise<number> {
	const text = await xpathText(page, xpath);
	const number = parseFloat(text);
	assert(!Number.isNaN(number));
	return number;
}

async function goto(page: Page, url: string) {
	await page.goto(url);
	await sleep(500 + Math.random() * 1000);
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

async function main() {
	// await collectPlayers();
	await collectStats();
	process.exit(0);
}

main();
