import { clamp, divide } from "~/shared/lib/numbers";

export interface PlayerPerformance {
	kills: number;
	deaths: number;
	avgk: number;
	hs: number;
	adr: number;
	kd: number;
	kpr: number;
	dpr: number;
	apr: number;
	hsp: number;
	kast: number;
	rating: number;
	firepower: number;
	mkpr: number;
}

// FACEIT added ADR and double kills in late June 2024, and CS:GO maps have neither.
interface MapStats {
	csgo: boolean;
	rounds: number;
	kills: number;
	deaths: number;
	assists: number;
	headshots: number;
	adr?: number;
	doubleKills?: number;
	tripleKills: number;
	quadroKills: number;
	pentaKills: number;
}

/** A map's figures as FACEIT's history and match stats report them. */
export interface PlayerMapStatsInput {
	Game: string;
	Kills: string;
	Deaths: string;
	Assists: string;
	Rounds: string;
	Headshots: string;
	ADR?: string;
	"Double Kills"?: string;
	"Triple Kills": string;
	"Quadro Kills": string;
	"Penta Kills": string;
}

export function aggregatePlayerPerformance(maps: PlayerMapStatsInput[]): PlayerPerformance {
	return computePlayerPerformance(maps.map(normalizeMapStats));
}

function normalizeMapStats(x: PlayerMapStatsInput): MapStats {
	return {
		csgo: x.Game === "csgo",
		kills: Number(x.Kills),
		deaths: Number(x.Deaths),
		assists: Number(x.Assists),
		rounds: Number(x.Rounds),
		headshots: Number(x.Headshots),
		adr: safeNumber(x.ADR),
		doubleKills: safeNumber(x["Double Kills"]),
		tripleKills: Number(x["Triple Kills"]),
		quadroKills: Number(x["Quadro Kills"]),
		pentaKills: Number(x["Penta Kills"]),
	};
}

function safeNumber(x: string | undefined) {
	if (x === undefined) return undefined;
	return Number(x);
}

function computePlayerPerformance(stats: MapStats[]): PlayerPerformance {
	const {
		kills,
		deaths,
		damage,
		headshots,
		rounds,
		assists,
		ratingAssists,
		doubleKills,
		tripleKills,
		quadroKills,
		pentaKills,
	} = stats.reduce<{
		kills: number;
		assists: number;
		ratingAssists: number;
		deaths: number;
		rounds: number;
		damage: number;
		headshots: number;
		doubleKills: number;
		tripleKills: number;
		quadroKills: number;
		pentaKills: number;
	}>(
		(total, x) => {
			const { rounds, kills, assists, deaths, headshots, tripleKills, quadroKills, pentaKills } = x;

			const kpr = divide(kills, rounds);
			// CS2 counts about 60% of the flash assists that CS:GO leaves out, and the fits take
			// assists the CS2 way.
			const ratingAssists = x.csgo ? assists * 1.16 : assists;

			const adr =
				x.adr ?? estimateAdr(x.csgo, kpr, divide(ratingAssists, rounds), divide(deaths, rounds));
			const doubleKills =
				x.doubleKills ??
				estimateDoubleKpr(
					kpr,
					divide(tripleKills, rounds),
					divide(quadroKills, rounds),
					divide(pentaKills, rounds),
				) * rounds;

			total.kills += kills;
			total.rounds += rounds;
			total.damage += adr * rounds;
			total.assists += assists;
			total.ratingAssists += ratingAssists;
			total.deaths += deaths;
			total.headshots += headshots;
			total.doubleKills += doubleKills;
			total.tripleKills += tripleKills;
			total.quadroKills += quadroKills;
			total.pentaKills += pentaKills;

			return total;
		},
		{
			kills: 0,
			deaths: 0,
			damage: 0,
			rounds: 0,
			assists: 0,
			ratingAssists: 0,
			headshots: 0,
			doubleKills: 0,
			tripleKills: 0,
			quadroKills: 0,
			pentaKills: 0,
		},
	);

	const kd = divide(kills, deaths);
	const hsp = divide(headshots, kills);
	const kpr = divide(kills, rounds);
	const dpr = divide(deaths, rounds);
	const apr = divide(assists, rounds);
	const adr = divide(damage, rounds);
	const mkpr = divide(doubleKills + tripleKills + quadroKills + pentaKills, rounds);
	const ratingApr = divide(ratingAssists, rounds);

	const kast = stats.length > 0 ? estimateKast(kpr, ratingApr, dpr) : 0;
	const rating = stats.length > 0 ? estimateRating(kpr, ratingApr, dpr, adr, mkpr) : 0;
	const firepower = stats.length > 0 ? estimateFirepower(kpr, adr, mkpr) : 0;

	return {
		kills,
		deaths,
		avgk: divide(kills, stats.length),
		hs: divide(headshots, stats.length),
		adr,
		kd,
		dpr,
		kpr,
		hsp,
		apr,
		kast,
		rating,
		firepower,
		mkpr,
	};
}

// Rating, KAST and firepower are fitted on HLTV pros, with assists and damage counted the way FACEIT
// counts them in CS2. The ADR and double kill estimates for older maps are fitted on recent FACEIT
// maps, and the ADR estimate for CS:GO maps on HLTV's CS:GO maps, as CS:GO maps had more damage for
// the same kills, assists and deaths. tools/rating has the data and the fits.
function estimateAdr(csgo: boolean, kpr: number, apr: number, dpr: number): number {
	if (csgo) return clamp(2.61 + 81.4 * kpr + 55.2 * apr + 13.7 * dpr, 0);
	return clamp(-3.36 + 82.1 * kpr + 46.3 * apr + 17.4 * dpr, 0);
}

function estimateKast(kpr: number, apr: number, dpr: number): number {
	return clamp(80.7 + 20.2 * kpr + 33.8 * apr - 44.2 * dpr, 0, 100);
}

function estimateRating(kpr: number, apr: number, dpr: number, adr: number, mkpr: number): number {
	// The fits saw no map above 150 ADR, and the curve would keep steepening past it.
	const damage = clamp(adr, 0, 150);
	return clamp(
		0.879 +
			0.751 * kpr +
			0.272 * apr -
			0.887 * dpr +
			0.000417 * damage +
			0.0000314 * damage ** 2 +
			0.0574 * mkpr,
		0,
	);
}

function estimateFirepower(kpr: number, adr: number, mkpr: number): number {
	return clamp(-194 + 128 * kpr + 1.3 * adr + 406 * mkpr, 0, 100);
}

function estimateDoubleKpr(
	kpr: number,
	tripleKpr: number,
	quadroKpr: number,
	pentaKpr: number,
): number {
	return clamp(-0.0822 + 0.367 * kpr - 1.02 * tripleKpr - 1.36 * quadroKpr - 1.7 * pentaKpr, 0, 1);
}
