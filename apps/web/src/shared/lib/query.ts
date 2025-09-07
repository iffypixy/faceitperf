import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			retryOnMount: true,
			refetchOnMount: "always",
			refetchOnWindowFocus: false,
			staleTime: 1000 * 60,
			gcTime: 1000 * 60 * 5,
		},
	},
});
