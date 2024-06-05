import {Match} from "@entities/match";

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

export const calculateAverageStats = (matches: Match[]) => {
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

	const kills = matches
		.map((match) => +match["Kills"])
		.reduce((prev, kills) => prev + kills, 0);

	const deaths = matches
		.map((match) => +match["Deaths"])
		.reduce((prev, deaths) => prev + deaths, 0);

	const kd = kills / deaths || 0;

	const dpr =
		matches
			.map((match) => +match["Deaths"] / +match["Rounds"])
			.reduce((prev, dpr) => prev + dpr, 0) / weight;

	const kpr =
		matches
			.map((match) => +match["K/R Ratio"])
			.reduce((prev, kpr) => prev + kpr, 0) / weight;

	const avgk = kills / weight;

	const adr =
		matches
			.map((match) => +match["K/R Ratio"] * DMG_PER_KILL)
			.reduce((prev, adr) => prev + adr, 0) / weight;

	const hs = matches
		.map((match) => +match["Headshots"])
		.reduce((prev, hs) => prev + hs, 0);

	const hsp = (hs / kills) * 100;

	const apr =
		matches
			.map((match) => +match["Assists"] / +match["Rounds"])
			.reduce((prev, apr) => prev + apr, 0) / weight;

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
			.reduce((prev, kast) => prev + kast, 0) / weight;

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
