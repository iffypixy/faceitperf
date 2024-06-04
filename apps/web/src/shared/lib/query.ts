import {QueryClient} from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retryOnMount: false,
			refetchOnMount: false,
			refetchOnWindowFocus: false,
			retry: false,
		},
	},
});
