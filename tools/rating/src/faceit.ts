import assert from "node:assert";
import fs from "node:fs";
import process from "node:process";

// FACEIT added ADR and double kills in late June 2024. The app estimates both for older maps, so
// the estimates are fitted on recent FACEIT maps, where the real values exist, rather than on pros.

process.loadEnvFile("../../apps/web/.env");

const PlayersPerLevel = 40;
const MatchesPerSeed = 10;

async function main() {
	const players = sampleByLevel(await rosterLevels(await rankedPlayers()));
	const rows: string[] = [];

	for (const [index, player] of players.entries()) {
		console.log(`Fetching maps of player ${index + 1}/${players.length}`);
		const { items } = await faceit<{ items: { stats: MapStats }[] }>(
			`players/${player.id}/games/cs2/stats?limit=100`,
		);

		for (const { stats: x } of items) {
			if (x["Game Mode"] !== "5v5" || x.ADR === undefined || x["Double Kills"] === undefined)
				continue;
			rows.push(
				[
					index,
					player.level,
					x.Rounds,
					x.Kills,
					x.Deaths,
					x.Assists,
					x.ADR,
					x["Double Kills"],
					x["Triple Kills"],
					x["Quadro Kills"],
					x["Penta Kills"],
				].join(","),
			);
		}
	}

	const header = "player,level,rounds,kills,deaths,assists,adr,2k,3k,4k,5k\n";
	fs.writeFileSync("./data/faceit.csv", header + rows.join("\n"), "utf8");
}

interface MapStats {
	"Game Mode": string;
	Rounds: string;
	Kills: string;
	Deaths: string;
	Assists: string;
	ADR?: string;
	"Double Kills"?: string;
	"Triple Kills": string;
	"Quadro Kills": string;
	"Penta Kills": string;
}

// Rankings only reach the top of each region, so their players' match rosters supply the rest of
// the levels.
async function rankedPlayers(): Promise<string[]> {
	const ids: string[] = [];
	for (const region of ["EU", "NA", "SA"])
		for (const offset of [0, 2000, 10000, 40000]) {
			const { items } = await faceit<{ items: { player_id: string }[] }>(
				`rankings/games/cs2/regions/${region}?offset=${offset}&limit=5`,
			);
			ids.push(...items.map((x) => x.player_id));
		}
	return ids;
}

async function rosterLevels(seeds: string[]): Promise<Map<string, number>> {
	const levels = new Map<string, number>();

	for (const seed of seeds) {
		const { items } = await faceit<{ items: { match_id: string }[] }>(
			`players/${seed}/history?game=cs2&limit=${MatchesPerSeed}`,
		);

		for (const { match_id } of items) {
			const match = await faceit<{
				teams: Record<string, { roster: { player_id: string; game_skill_level: number }[] }>;
			}>(`matches/${match_id}`);

			for (const team of Object.values(match.teams))
				for (const p of team.roster) levels.set(p.player_id, p.game_skill_level);
		}
	}

	return levels;
}

function sampleByLevel(levels: Map<string, number>): { id: string; level: number }[] {
	const byLevel = new Map<number, string[]>();
	for (const [id, level] of levels) byLevel.set(level, [...(byLevel.get(level) ?? []), id]);

	return [...byLevel].flatMap(([level, ids]) =>
		shuffle(ids)
			.slice(0, PlayersPerLevel)
			.map((id) => ({ id, level })),
	);
}

async function faceit<T>(path: string): Promise<T> {
	const res = await fetch(`${process.env.VITE_FACEIT_API_URL}/${path}`, {
		headers: { Authorization: `Bearer ${process.env.VITE_FACEIT_API_KEY}` },
	});
	assert(res.ok, `faceit ${path}: ${res.status}`);
	// The Data API's responses are trusted to have the shape each caller asks for.
	return (await res.json()) as T;
}

function shuffle<T>(xs: T[]): T[] {
	return xs
		.map((x) => ({ x, key: Math.random() }))
		.sort((a, b) => a.key - b.key)
		.map(({ x }) => x);
}

main();
