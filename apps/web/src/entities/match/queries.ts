import {useQuery} from "@tanstack/react-query";

import * as api from "@shared/api";

export const useMatch = (matchId: string) => {
	const {data: match, ...query} = useQuery({
		queryKey: ["match", matchId],
		queryFn: async () => {
			const {match} = await api.loadMatch(matchId);

			return match;
		},
	});

	return {
		match,
		...query,
	};
};
