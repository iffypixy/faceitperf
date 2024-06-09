import {AxiosError} from "axios";

import {
	Player,
	calculateAverageStats,
	calculateCurrentForm,
} from "@entities/profile";
import {Match, groupMatchesIntoSessions} from "@entities/match";
import {Dto, ReqWithPagination} from "@shared/lib/types";
import {request} from "@shared/lib/request";

const MAX_LIMIT = {
	MATCHES: 100,
	PLAYERS: 100,
};

interface ReqWithUsername {
	username: string;
}

type GetPlayerDto = Dto<
	ReqWithUsername,
	{
		start: number;
		end: number;
		items: Player[];
	}
>;

const getPlayer = async (req: GetPlayerDto["req"], signal?: AbortSignal) => {
	let counter = 0;

	const players: Player[] = [];

	do {
		const {
			data: {items},
		} = await request<GetPlayerDto["res"]>({
			method: "GET",
			url: "/search/players",
			params: {
				nickname: req.username,
				game: "cs2",
			},
			signal,
		});

		players.push(...items);

		counter++;
	} while (counter * MAX_LIMIT.PLAYERS === players.length);

	return players.find(
		(p) => p.nickname.toLowerCase() === req.username.toLowerCase(),
	);
};

type GetMatchesDto = Dto<
	ReqWithPagination & {
		playerId: string;
	},
	{
		start: number;
		end: number;
		items: {
			stats: Match;
		}[];
	}
>;

const getMatches = async (req: GetMatchesDto["req"], signal?: AbortSignal) => {
	const {
		data: {items: matches},
	} = await request<GetMatchesDto["res"]>({
		method: "GET",
		url: `/players/${req.playerId}/games/cs2/stats`,
		params: {
			limit: req.limit || MAX_LIMIT.MATCHES,
			offset: req.skip || 0,
		},
		signal,
	});

	return matches.map((match) => match.stats);
};

const getAllMatches = async (playerId: string, signal?: AbortSignal) => {
	let counter = 0;

	const matches: Match[] = [];

	do {
		const loaded = await getMatches(
			{
				playerId,
				skip: matches.length,
			},
			signal,
		);

		matches.push(...loaded);

		counter++;
	} while (counter * MAX_LIMIT.MATCHES === matches.length);

	return matches;
};

export const getProfile = async (username: string, signal?: AbortSignal) => {
	const player = await getPlayer({username}, signal);

	if (!player) throw new AxiosError("Player not found");

	const matches = await getAllMatches(player.player_id, signal);
	const sessions = groupMatchesIntoSessions(matches);

	const currentForm = calculateCurrentForm(matches);

	return {
		profile: {
			faceit: `https://www.faceit.com/en/players/${player.nickname}`,
			username: player.nickname,
			avatar: player.avatar,
			currentForm,
			lifetimeForm: {
				stats: calculateAverageStats(matches),
				matches: matches.length,
			},
			matches: matches.map((match) => ({
				date: new Date(match["Created At"]),
				id: match["Match Id"],
				map: match["Map"],
				kills: +match["Kills"],
				deaths: +match["Deaths"],
				rating: calculateAverageStats([match]).rating,
				faceit: `https://www.faceit.com/en/cs2/room/${match["Match Id"]}`,
				result: +match["Result"],
			})),
			sessions: sessions.map((session) => ({
				date: new Date(session[0]["Created At"]),
				matches: session.length,
				kd: calculateAverageStats(session).kd,
				rating: calculateAverageStats(session).rating,
			})),
		},
	};
};

type GetMatchDto = Dto<
	string,
	{
		best_of: number;
		broadcast_start_time: number;
		broadcast_start_time_label: boolean;
		calculate_elo: boolean;
		chat_room_id: string;
		competition_id: string;
		competition_name: string;
		competition_type: string;
		configured_at: number;
		demo_url: string[];
		detailed_results: [
			{
				asc_score: boolean;
				factions: {
					property1: {
						score: number;
					};
					property2: {
						score: number;
					};
				};
				winner: string;
			},
		];
		faceit_url: string;
		finished_at: number;
		game: string;
		group: number;
		match_id: string;
		organizer_id: string;
		region: string;
		results: {
			score: {
				faction1: number;
				faction2: number;
			};
			winner: string;
		};
		round: number;
		scheduled_at: number;
		started_at: number;
		status: "FINISHED" | "ONGOING";
		teams: {
			faction1: {
				avatar: string;
				faction_id: string;
				leader: string;
				name: string;
				roster: [
					{
						anticheat_required: boolean;
						avatar: string;
						game_player_id: string;
						game_player_name: string;
						game_skill_level: number;
						membership: string;
						nickname: string;
						player_id: string;
					},
				];
				roster_v1: null;
				stats: {
					rating: number;
					skillLevel: {
						average: number;
						range: {
							max: number;
							min: number;
						};
					};
					winProbability: number;
				};
				substituted: boolean;
				type: string;
			};
			faction2: {
				avatar: string;
				faction_id: string;
				leader: string;
				name: string;
				roster: [
					{
						anticheat_required: boolean;
						avatar: string;
						game_player_id: string;
						game_player_name: string;
						game_skill_level: number;
						membership: string;
						nickname: string;
						player_id: string;
					},
				];
				roster_v1: null;
				stats: {
					rating: number;
					skillLevel: {
						average: number;
						range: {
							max: number;
							min: number;
						};
					};
					winProbability: number;
				};
				substituted: boolean;
				type: string;
			};
		};
		version: number;
		voting: {
			location?: {
				entities: {
					class_name: string;
					game_location_id: string;
					guid: string;
					image_lg: string;
					image_sm: string;
					name: string;
				}[];
				pick: string[];
			};
			map?: {
				entities: {
					class_name: string;
					game_location_id: string;
					guid: string;
					image_lg: string;
					image_sm: string;
					name: string;
				}[];
				pick: string[];
			};
		};
	}
>;

export const getMatch = async (matchId: GetMatchDto["req"]) => {
	const {data: match} = await request<GetMatchDto["res"]>({
		url: `/matches/${matchId}`,
	});

	const server = match.voting.location?.pick[0];
	const map = match.voting.map?.pick[0];

	return {
		id: match.match_id,
		startedAt: new Date(match.started_at * 1000),
		finishedAt: new Date(match.finished_at * 1000),
		bo: match.best_of,
		team1: match.teams.faction1,
		team2: match.teams.faction2,
		status: match.status,
		winner: {
			team1: match.results.winner === "faction1",
			team2: match.results.winner === "faction2",
		},
		demo: match.demo_url[0],
		server: {
			name: server,
			image: {
				sm: match.voting.location?.entities.find(
					(entity) => entity.guid === server,
				)?.image_sm,
				lg: match.voting.location?.entities.find(
					(entity) => entity.guid === server,
				)?.image_lg,
			},
		},
		map: {
			name: map,
			image: {
				sm: match.voting.map?.entities.find(
					(entity) => entity.guid === map,
				)?.image_sm,
				lg: match.voting.map?.entities.find(
					(entity) => entity.guid === map,
				)?.image_lg,
			},
		},
	};
};

export type GetVetoProcessDto = Dto<
	string,
	{
		payload: {
			match_id: string;
			tickets: {
				entities: [
					{
						guid: string;
						status: "pick" | "drop";
						random: boolean;
						round: number;
						selected_by: "faction1" | "faction2";
					},
				];
				entity_type: "location" | "map";
				vote_type: "drop_pick";
			}[];
		};
	}
>;

export const getVetoProcess = async (matchId: GetVetoProcessDto["req"]) => {
	const {data} = await request<GetVetoProcessDto["res"]>({
		url: `https://corsproxy.io/?${encodeURIComponent(`https://api.faceit.com/democracy/v1/match/${matchId}/history`)}`,
		method: "GET",
		headers: {
			Authorization: null,
		},
	});

	return data.payload.tickets;
};

export type GetMatchStatsDto = Dto<
	string,
	{
		rounds: {
			best_of: string;
			competition_id: any;
			game_id: string;
			game_mode: string;
			match_id: string;
			match_round: string;
			played: string;
			round_stats: {
				Region: string;
				Score: string;
				Winner: string;
				Map: string;
				Rounds: string;
			};
			teams: {
				team_id: string;
				premade: boolean;
				team_stats: {
					"Second Half Score": string;
					"Team Win": string;
					"Team Headshots": string;
					Team: string;
					"Final Score": string;
					"Overtime score": string;
					"First Half Score": string;
				};
				players: {
					player_id: string;
					nickname: string;
					player_stats: {
						MVPs: string;
						"Penta Kills": string;
						Deaths: string;
						"K/R Ratio": string;
						"Headshots %": string;
						Kills: string;
						"Triple Kills": string;
						"Quadro Kills": string;
						Assists: string;
						Headshots: string;
						Result: string;
						"K/D Ratio": string;
					};
				}[];
			}[];
		}[];
	}
>;

export const getMatchStats = async (matchId: GetMatchStatsDto["req"]) => {
	const {
		data: {rounds},
	} = await request<GetMatchStatsDto["res"]>({
		url: `/matches/${matchId}/stats`,
		method: "GET",
	});

	const team1 = rounds[0].teams[0];
	const team2 = rounds[0].teams[1];

	return {
		score: [
			{
				teamId: team1.team_id,
				firstHalfScore: team1.team_stats["First Half Score"],
				secondHalfScore: team1.team_stats["Second Half Score"],
				score: team1.team_stats["Final Score"],
				overtimeScore: team1.team_stats["Overtime score"],
			},
			{
				teamId: team2.team_id,
				firstHalfScore: team2.team_stats["First Half Score"],
				secondHalfScore: team2.team_stats["Second Half Score"],
				score: team2.team_stats["Final Score"],
				overtimeScore: team2.team_stats["Overtime score"],
			},
		],
		isOvertime:
			+team1.team_stats["Overtime score"] ||
			+team2.team_stats["Overtime score"],
		team1: team1.players,
		team2: team2.players,
		rounds: +rounds[0].round_stats.Rounds,
	};
};

type GetPlayerDetailsDto = Dto<
	string,
	{
		activated_at: string;
		avatar: string;
		country: string;
		cover_featured_image: string;
		cover_image: string;
		faceit_url: string;
		friends_ids: string[];
		games: Record<
			string,
			{
				faceit_elo: number;
				game_player_id: string;
				game_player_name: string;
				game_profile_id: string;
				region: string;
				regions: any;
				skill_level: number;
				skill_level_label: string;
			}
		>;
		infractions: any;
		membership_type: string;
		memberships: string[];
		new_steam_id: string;
		nickname: string;
		platforms: Record<string, string>;
		player_id: string;
		settings: {
			language: string;
		};
		steam_id_64: string;
		steam_nickname: string;
		verified: boolean;
	}
>;

export const getPlayerDetails = async (playerId: GetPlayerDetailsDto["req"]) =>
	request<GetPlayerDetailsDto["res"]>({
		url: `/players/${playerId}`,
		method: "GET",
	});

export const loadMatch = async (matchId: string) => {
	const [match, veto, stats] = await Promise.all([
		getMatch(matchId),
		getVetoProcess(matchId),
		getMatchStats(matchId),
	]);

	if (!match || !veto || !stats) throw new AxiosError("No match found");

	const countries = {
		team1: await Promise.all(
			match.team1.roster.map((player) =>
				getPlayerDetails(player.player_id).then((details) => ({
					id: player.player_id,
					country: details.data.country,
				})),
			),
		),
		team2: await Promise.all(
			match.team2.roster.map((player) =>
				getPlayerDetails(player.player_id).then((details) => ({
					id: player.player_id,
					country: details.data.country,
				})),
			),
		),
	};

	return {
		match: {
			...match,
			stats,
			veto,
			countries,
		},
	};
};
