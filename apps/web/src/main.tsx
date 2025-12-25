import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import ReactGA from "react-ga4";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";

import { ChangelogProvider } from "@shared/lib/changelog";
import { queryClient } from "@shared/lib/query";
import { Env } from "@shared/env";
import { App } from "./app";
import "./globals.css";

posthog.init(Env.VITE_PUBLIC_POSTHOG_KEY, {
	api_host: Env.VITE_PUBLIC_POSTHOG_HOST,
	defaults: "2025-05-24",
});

ReactGA.initialize(Env.VITE_GA_MEASUREMENT_ID);
ReactGA.send({ hitType: "pageview" });

const root = document.getElementById("root")!;
createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<PostHogProvider client={posthog}>
			<ChangelogProvider>
				<App />
			</ChangelogProvider>
		</PostHogProvider>
	</QueryClientProvider>,
);
