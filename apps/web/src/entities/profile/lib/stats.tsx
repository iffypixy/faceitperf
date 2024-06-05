import {Match} from "@entities/match";

export const calculateCurrentForm = (sessions: Match[][]) => {
	const recent = Math.min(5, sessions.length);

	return sessions
		.slice(0, recent)
		.map(calculateAverageStats)
		.reduce(
			(prev, stats, _, {length}) => ({
				kd: prev.kd + stats.kd / length,
				rating: prev.rating + stats.rating / length,
				impact: prev.impact + stats.impact / length,
				kast: prev.kast + stats.kast / length,
				dpr: prev.dpr + stats.dpr / length,
				kpr: prev.kpr + stats.kpr / length,
				adr: prev.adr + stats.adr / length,
				avgk: prev.avgk + stats.avgk / length,
				apr: prev.apr + stats.apr / length,
				hsp: prev.hsp + stats.hsp / length,
			}),
			{
				kd: 0,
				rating: 0,
				impact: 0,
				kast: 0,
				dpr: 0,
				kpr: 0,
				adr: 0,
				avgk: 0,
				apr: 0,
				hsp: 0,
			},
		);
};

export const calculateAverageStats = (matches: Match[]) => {
	const DMG_PER_KILL = 110;
	const TRADE_PERCENT = 0.2;

	const kills = matches
		.map((match) => +match["Kills"])
		.reduce((prev, kills) => prev + kills, 0);

	const deaths = matches
		.map((match) => +match["Deaths"])
		.reduce((prev, deaths) => prev + deaths, 0);

	const kd = kills / deaths;

	const dpr =
		matches
			.map((match) => +match["Deaths"] / +match["Rounds"])
			.reduce((prev, dpr) => prev + dpr, 0) / matches.length;

	const kpr =
		matches
			.map((match) => +match["K/R Ratio"])
			.reduce((prev, kpr) => prev + kpr, 0) / matches.length;

	const avgk = kills / matches.length;

	const adr =
		matches
			.map((match) => +match["K/R Ratio"] * DMG_PER_KILL)
			.reduce((prev, adr) => prev + adr, 0) / matches.length;

	const hs = matches
		.map((match) => +match["Headshots"])
		.reduce((prev, hs) => prev + hs, 0);

	const hsp = (hs / kills) * 100;

	const apr =
		matches
			.map((match) => +match["Assists"] / +match["Rounds"])
			.reduce((prev, apr) => prev + apr, 0) / matches.length;

	const kast =
		matches
			.map((match) => {
				const kills = +match["Kills"];
				const deaths = +match["Deaths"];
				const assists = +match["Assists"];
				const rounds = +match["Rounds"];
				const survived = rounds - deaths;
				const traded = TRADE_PERCENT * rounds;

				const sum = (kills + assists + survived + traded) * 0.45;

				return Math.min((sum / rounds) * 100, 100);
			})
			.reduce((prev, kast) => prev + kast, 0) / matches.length;

	const impact = 2.13 * kpr + 0.42 * apr - 0.41;

	const rating =
		0.0073 * kast +
		0.3591 * kpr +
		-0.5329 * dpr +
		0.2372 * impact +
		0.0032 * adr +
		0.1587;

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
		weight: matches.length,
	};
};