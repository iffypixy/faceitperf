import {Controller, Get, NotFoundException, Query} from "@nestjs/common";

import {request} from "@lib/request";

import {LifetimeStats, LoadMatchesReq, Match} from "./app.types";

@Controller()
export class AppController {
	private SESSION_INTERVAL_HOURS = 10;
	private MATCH_DURATION = 0.65;
	private DMG_PER_KILL = 110;
	private TRADE_PERCENT = 0.2;

	private groupMatchesIntoSessions(matches: Match[]) {
		const sessions: Match[][] = [];

		matches.forEach((match) => {
			const time = new Date(match["Created At"]).getTime();

			const empty = sessions.length === 0;

			if (empty) {
				sessions.push([match]);
			} else {
				const lastSession = sessions[sessions.length - 1];
				const lastMatch = lastSession[lastSession.length - 1];

				const lastMatchTime = new Date(
					lastMatch["Created At"],
				).getTime();

				const timeDifference =
					(lastMatchTime - time) / (1000 * 60 * 60);

				const timeThreshold =
					this.SESSION_INTERVAL_HOURS + this.MATCH_DURATION;

				if (timeDifference <= timeThreshold) {
					lastSession.push(match);
				} else {
					sessions.push([match]);
				}
			}
		});

		sessions.pop();

		return sessions;
	}

	private calculateStats(matches: Match[]) {
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
				.map((match) => +match["K/R Ratio"] * this.DMG_PER_KILL)
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
					const traded = this.TRADE_PERCENT * rounds;

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
	}

	private async loadMatches({playerId, limit, skip}: LoadMatchesReq) {
		const {
			data: {items: matches},
		} = await request.client<{
			start: number;
			end: number;
			items: {
				stats: Match;
			}[];
		}>({
			method: "GET",
			url: `/players/${playerId}/games/cs2/stats`,
			params: {
				limit: +limit || 100,
				offset: +skip || 0,
			},
		});

		return matches.map((match) => match.stats);
	}

	private async loadPlayer(username: string) {
		const {
			data: {items: players},
		} = await request.client<{
			start: number;
			end: number;
			items: {
				player_id: string;
				nickname: string;
				status: string;
				games: {
					name: string;
					skill_level: string;
				}[];
				country: string;
				verified: boolean;
				avatar: string;
			}[];
		}>({
			method: "GET",
			url: "/search/players",
			params: {
				nickname: username,
				game: "cs2",
			},
		});

		return players[0];
	}

	private async loadLifetimeStats(playerId: string) {
		const {
			data: {lifetime},
		} = await request.client<{
			lifetime: LifetimeStats;
		}>({
			method: "GET",
			url: `/players/${playerId}/stats/cs2`,
		});

		return lifetime;
	}

	@Get("sessions")
	async getSessions(
		@Query("username") username: string,
		@Query("limit") limit?: string,
		@Query("skip") skip?: string,
	) {
		const player = await this.loadPlayer(username);

		if (!player) throw new NotFoundException("Player not found");

		const playerId = player.player_id;

		const matches = await this.loadMatches({
			playerId,
			limit: +limit,
			skip: +skip,
		});

		const sessions = this.groupMatchesIntoSessions(matches);

		const stats = sessions.map(this.calculateStats);

		const total = stats
			.map(({weight}) => weight)
			.reduce((prev, weight) => prev + weight, 0);

		return {
			sessions: {
				list: stats,
				total,
			},
		};
	}

	@Get("form")
	async getForm(@Query("username") username: string) {
		const player = await this.loadPlayer(username);

		if (!player) throw new NotFoundException("Player not found");

		const playerId = player.player_id;

		const matches = await this.loadMatches({
			playerId,
			limit: 50,
			skip: 0,
		});

		const sessions = this.groupMatchesIntoSessions(matches);

		const recent = Math.min(sessions.length, 5);

		const form = sessions.slice(recent).map(this.calculateStats);

		return {
			form,
		};
	}

	@Get("stats/lifetime")
	async getLifetimeStats(@Query("username") username: string) {
		const player = await this.loadPlayer(username);

		if (!player) throw new NotFoundException("Player not found");

		const playerId = player.player_id;

		const stats = await this.loadLifetimeStats(playerId);

		return {
			stats: {
				kd: stats["K/D Ratio"],
				hsp: stats["Total Headshots %"],
			},
		};
	}
}
