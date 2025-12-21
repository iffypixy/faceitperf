import { clamp, divide } from "@shared/lib/numbers";

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

// ADR and double kills were added late June 2024.
export interface MapStats {
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

export function computePlayerPerformance(stats: MapStats[]): PlayerPerformance {
	const {
		kills,
		deaths,
		damage,
		headshots,
		rounds,
		assists,
		doubleKills,
		tripleKills,
		quadroKills,
		pentaKills,
	} = stats.reduce<{
		kills: number;
		assists: number;
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
			const apr = divide(assists, rounds);

			const adr = x.adr ?? estimateAdr(divide(kills, rounds), divide(assists, rounds));
			const doubleKills =
				x.doubleKills ??
				estimateDoubleKpr(
					kpr,
					apr,
					adr,
					divide(tripleKills, rounds),
					divide(quadroKills, rounds),
					divide(pentaKills, rounds),
				) * rounds;

			total.kills += kills;
			total.rounds += rounds;
			total.damage += adr * rounds;
			total.assists += assists;
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

	const kast = stats.length > 0 ? estimateKast(kpr, apr, dpr) : 0;
	const rating = stats.length > 0 ? estimateRating(kpr, apr, dpr, adr, mkpr) : 0;
	const firepower = stats.length > 0 ? estimateFirepower(kpr, apr, adr, mkpr) : 0;

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

function estimateAdr(kpr: number, apr: number): number {
	const adr = 3.3276314054649703 + kpr * 86.61895172 + apr * 78.64156577;
	return clamp(adr, 0);
}

function estimateKast(kpr: number, apr: number, dpr: number): number {
	const kast = 85.77576693024515 + kpr * 14.59741003 + apr * 39.57510705 - dpr * 46.21062528;
	return clamp(kast, 0, 100);
}

function estimateRating(kpr: number, apr: number, dpr: number, adr: number, mkpr: number): number {
	const rating =
		0.6844811040150518 +
		kpr * 0.65597945 +
		apr * 0.31304591 -
		dpr * 0.75999214 +
		adr * 0.00370714 +
		mkpr * 0.72169367;
	return clamp(rating, 0);
}

function estimateFirepower(kpr: number, apr: number, adr: number, mkpr: number): number {
	const firepower =
		-187.0508572575841 +
		kpr * 160.34947296 -
		apr * 15.18186891 +
		adr * 1.36153342 +
		mkpr * 228.48279068;
	return clamp(firepower, 0, 100);
}

function estimateDoubleKpr(
	kpr: number,
	apr: number,
	adr: number,
	tripleKpr: number,
	quadroKpr: number,
	pentaKpr: number,
): number {
	const doubleKpr =
		-0.05357045289282321 +
		kpr * 0.279077598 -
		apr * 0.00786663351 +
		adr * 0.000195105388 -
		tripleKpr * 0.617993888 -
		quadroKpr * 0.946751056 +
		pentaKpr * 0.419746708;
	return clamp(doubleKpr, 0, 1);
}
