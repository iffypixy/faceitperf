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
			lifetimeStats: calculateAverageStats(matches),
			matches: matches.map((match) => ({
				date: new Date(match["Created At"]),
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
