import {useQuery} from "@tanstack/react-query";

import * as api from "@shared/api";

export const useProfile = (username: string) => {
	const {
		data: profile,
		refetch: refetchProfile,
		...query
	} = useQuery({
		enabled: Boolean(username),
		queryKey: ["profile", username],
		queryFn: async ({signal}) => {
			const {profile} = await api.getProfile(username, signal);

			return profile;
		},
		staleTime: 1000 * 60 * 5,
	});

	return {...query, profile, refetchProfile};
};
