import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";

import { queryClient } from "@shared/lib/query";
import { GoogleAnalytics } from "@shared/lib/analytics";
import { Env } from "@shared/env";
import { App } from "./app";
import "./index.css";

posthog.init(Env.VITE_PUBLIC_POSTHOG_KEY, {
	api_host: Env.VITE_PUBLIC_POSTHOG_HOST,
	defaults: "2025-05-24",
});

const root = document.getElementById("root")!;
createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<PostHogProvider client={posthog}>
			<GoogleAnalytics>
				<App />
			</GoogleAnalytics>
		</PostHogProvider>
	</QueryClientProvider>,
);
