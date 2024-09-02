import {GameStats, Match} from "@entities/match";

export const calculateCurrentForm = (matches: Match[]) => {
	const recent = () => {
		const currentDate = new Date();
		const twoWeeksAgo = new Date();

		twoWeeksAgo.setDate(currentDate.getDate() - 14);

		return matches.filter((match) => {
			const date = new Date(match["Created At"]);

			return date >= twoWeeksAgo;
		});
	};

	return {
		stats: calculateAverageStats(recent()),
		matches: recent().length,
	};
};

export const calculateAverageStats = (matches: GameStats[]) => {
	const DMG_PER_KILL = 105;
	const TRADE_PERCENT = 0.2;

	const weight = matches.length;

	if (weight === 0)
		return {
			kills: 0,
			deaths: 0,
			kd: 0,
			dpr: 0,
			kpr: 0,
			avgk: 0,
			adr: 0,
			hs: 0,
			hsp: 0,
			apr: 0,
			kast: 0,
			impact: 0,
			rating: 0,
			weight,
		};

	const matchStats = matches.map((match) => {
		return {
			kills: +match["Kills"],
			deaths: +match["Deaths"],
			rounds: +match["Rounds"],
			kpr: +match["K/R Ratio"],
			adr: +match["ADR"] || +match["K/R Ratio"] * DMG_PER_KILL, // adr was added late june, so estimate it until it was added
			headshots: +match["Headshots"],
			assists: +match["Assists"],
		};
	});

	const kills = matchStats.reduce((prev, stat) => prev + stat.kills, 0);
	const deaths = matchStats.reduce((prev, stat) => prev + stat.deaths, 0);
	const kd = kills / deaths || 0;

	const dpr =
		matchStats.reduce((prev, stat) => prev + stat.deaths / stat.rounds, 0) /
		weight;
	const kpr = matchStats.reduce((prev, stat) => prev + stat.kpr, 0) / weight;
	const avgk = kills / weight;
	const adr = matchStats.reduce((prev, stat) => prev + stat.adr, 0) / weight;

	const hs = matchStats.reduce((prev, stat) => prev + stat.headshots, 0);
	const hsp = (hs / kills) * 100;
	const apr =
		matchStats.reduce(
			(prev, stat) => prev + stat.assists / stat.rounds,
			0,
		) / weight;

	const kast =
		matchStats.reduce((prev, stat) => {
			const survived = stat.rounds - stat.deaths;
			const traded = TRADE_PERCENT * stat.rounds;
			const sum = (stat.kills + stat.assists + survived + traded) * 0.45;
			return prev + Math.min((sum / stat.rounds) * 100, 100);
		}, 0) / weight;

	const impact = Math.max(2.13 * kpr + 0.42 * apr - 0.41, 0);
	const rating = Math.max(
		0.0073 * kast +
			0.3591 * kpr +
			-0.5329 * dpr +
			0.2372 * impact +
			0.0032 * adr +
			0.1587,
		0,
	);

	return {
		kills,
		deaths,
		kd,
		dpr,
		kpr,
		avgk,
		adr,
		hs,
		hsp,
		apr,
		kast,
		impact,
		rating,
		weight,
	};
};
