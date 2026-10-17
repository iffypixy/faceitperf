// Collects Rating 2.0 stats from HLTV: 4 of the latest 50 maps on each of 2 days a month from 2018
// to 2023, the careers of 300 of their players, and a check of what HLTV's assists per round count.
//
// HLTV's Cloudflare check turns away automated browsers, so this runs in a normal one: open
// https://www.hltv.org/stats, pass the check, paste this file into the console and keep the tab
// visible until hltv.json downloads (about 35 minutes). Each page is kept in localStorage, so
// pasting it again after an interruption resumes where it stopped.
{
	const StorageKey = "faceitperf-hltv";
	const CareerQuery = "startDate=2017-06-14&endDate=2023-09-30&csVersion=CSGO";

	const cache = JSON.parse(localStorage.getItem(StorageKey) ?? "{}");
	let fetched = 0;

	async function main() {
		const maps = [];
		for (const day of sampleDays())
			for (const path of await cached(
				`/stats/matches?startDate=${day}&endDate=${day}&csVersion=CSGO`,
				parseMapList,
			))
				maps.push({ path, ...(await cached(path, parseMap)) });

		const careers = [];
		for (const { id, nickname } of spread(distinctPlayers(maps), 300))
			careers.push({
				id,
				overview: await cached(`/stats/players/${id}/${nickname}?${CareerQuery}`, parseOverview),
				individual: await cached(
					`/stats/players/individual/${id}/${nickname}?${CareerQuery}`,
					parseRows,
				),
			});

		// A player's stats filtered to a single map tell whether HLTV's assists per round include the
		// flash assists its scoreboards list separately.
		const assists = [];
		for (const { map, player } of spread(flashAssistRows(maps), 24))
			assists.push({
				path: map.path,
				id: player.id,
				overview: await cached(
					`/stats/players/${player.id}/${player.nickname}?startDate=${map.day}&endDate=${map.day}&maps=de_${map.name.toLowerCase()}`,
					parseOverview,
				),
			});

		download("hltv.json", JSON.stringify({ maps, careers, assists }));
		localStorage.removeItem(StorageKey);
		console.log("Done, hltv.json is in your downloads.");
	}

	// The 10th and 24th of each month, from 2018 until CS2 replaced CS:GO in September 2023.
	function sampleDays() {
		const days = [];
		for (let year = 2018; year <= 2023; year++)
			for (let month = 1; month <= 12; month++)
				for (const day of [10, 24])
					if (year < 2023 || month <= 8)
						days.push(`${year}-${String(month).padStart(2, "0")}-${day}`);
		return days;
	}

	function parseMapList(doc) {
		const paths = [...doc.querySelectorAll("a[href*='/stats/matches/mapstatsid/']")].map(
			(a) => a.getAttribute("href").split("?")[0],
		);
		return spread([...new Set(paths)], 4);
	}

	function parseMap(doc) {
		const box = doc.querySelector(".match-info-box");
		const text = (el, selector) => el.querySelector(selector)?.textContent.trim();

		return {
			rating: text(doc, "th.st-rating .ratingDesc"),
			day: text(box, "[data-unix]").slice(0, 10),
			name: [...box.childNodes]
				.filter((node) => node.nodeType === Node.TEXT_NODE)
				.map((node) => node.textContent.trim())
				.join(""),
			score: [...box.querySelectorAll(".team-left .bold, .team-right .bold")].map(
				(x) => x.textContent,
			),
			players: [...doc.querySelectorAll("table.totalstats tbody tr")].map((tr) => {
				const [, , , id, nickname] = tr
					.querySelector("td.st-player a")
					.getAttribute("href")
					.split("?")[0]
					.split("/");
				return {
					id,
					nickname,
					openingKills: text(tr, "td.st-opkd.traditional-data"),
					multiKills: text(tr, "td.st-mks"),
					kast: text(tr, "td.st-kast.gtSmartphone-only.traditional-data"),
					kills: text(tr, "td.st-kills.traditional-data"),
					assists: text(tr, "td.st-assists"),
					deaths: text(tr, "td.st-deaths.traditional-data"),
					adr: text(tr, "td.st-adr.traditional-data"),
					rating: text(tr, "td.st-rating"),
				};
			}),
		};
	}

	function parseOverview(doc) {
		const summary = [...doc.querySelectorAll(".player-summary-stat-box-data-wrapper")].map(
			(box) => [
				box
					.querySelector(".player-summary-stat-box-data-text.traditionalData")
					?.firstChild.textContent.trim(),
				box.querySelector(".player-summary-stat-box-data.traditionalData")?.textContent.trim(),
			],
		);

		return {
			...parseRows(doc),
			...Object.fromEntries(summary.filter(([label]) => label)),
			rating: doc.querySelector(".player-summary-stat-box-rating-data-text")?.textContent.trim(),
			ratingVersion: doc
				.querySelector(".player-summary-stat-box-data-description-text")
				?.firstChild.textContent.trim(),
			firepower: doc.querySelector(".row-stats-section-score")?.textContent.trim(),
		};
	}

	function parseRows(doc) {
		return Object.fromEntries(
			[...doc.querySelectorAll(".stats-row")].map((row) =>
				[...row.querySelectorAll("span")].map((span) => span.textContent.trim()),
			),
		);
	}

	function distinctPlayers(maps) {
		const players = new Map();
		for (const map of maps) for (const p of map.players) players.set(p.id, p);
		return [...players.values()];
	}

	function flashAssistRows(maps) {
		return maps.flatMap((map) =>
			map.players.filter((p) => !p.assists.endsWith("(0)")).map((player) => ({ map, player })),
		);
	}

	// Evenly spaced picks, so a sample covers a whole list instead of its start.
	function spread(xs, count) {
		if (xs.length <= count) return xs;
		return Array.from({ length: count }, (_, i) => xs[Math.floor((i * xs.length) / count)]);
	}

	async function cached(path, parse) {
		if (!(path in cache)) {
			cache[path] = parse(await load(path));
			try {
				localStorage.setItem(StorageKey, JSON.stringify(cache));
			} catch (e) {
				console.warn(`Couldn't save progress, so an interruption restarts the run: ${e}`);
			}
		}
		return cache[path];
	}

	async function load(path) {
		for (;;) {
			const res = await fetch(path);
			const html = await res.text();

			// Cloudflare answers 403 with its check page once the session's clearance runs out.
			if (res.status === 403 || res.status === 429 || html.includes("Just a moment")) {
				console.warn(
					`HLTV answered ${res.status}. Pass the check in another HLTV tab; retrying in 30 s.`,
				);
				await sleep(30000);
				continue;
			}
			if (!res.ok) throw new Error(`load ${path}: ${res.status}`);

			if (++fetched % 25 === 0) console.log(`${fetched} pages fetched`);
			await sleep(1000);
			return new DOMParser().parseFromString(html, "text/html");
		}
	}

	function download(name, text) {
		const a = document.createElement("a");
		a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
		a.download = name;
		a.click();
	}

	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	main();
}
