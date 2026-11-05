import { createQueryKeys } from "@lukemorales/query-key-factory";
import { useQuery } from "@tanstack/react-query";

import { faceitApi } from "~/shared/api";

export function playerUrl(nickname: string): string {
	return `/players/${nickname}`;
}

interface PlayerDetails {
	country: string;
	games: Record<string, { faceit_elo: number; skill_level: number }>;
}

const queryKeys = createQueryKeys("player", {
	byId: (playerId: string) => [playerId],
});

export function usePlayerDetailsQuery(playerId: string) {
	return useQuery({
		queryKey: queryKeys.byId(playerId).queryKey,
		queryFn: ({ signal }) => faceitApi.get<PlayerDetails>(`players/${playerId}`, { signal }).json(),
	});
}
