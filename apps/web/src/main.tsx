import { PostHogProvider } from "@posthog/react";
import { QueryClientProvider } from "@tanstack/react-query";
import posthog from "posthog-js";
import { createRoot } from "react-dom/client";
import ReactGA from "react-ga4";

import { ChangelogProvider } from "~/features/changelog";
import { Routes } from "~/pages/routes";
import { Env } from "~/shared/env";
import { assert } from "~/shared/lib/assert";
import { queryClient } from "~/shared/lib/query";
import "~/globals.css";

posthog.init(Env.VITE_PUBLIC_POSTHOG_KEY, {
	api_host: Env.VITE_PUBLIC_POSTHOG_HOST,
	defaults: "2025-05-24",
});

ReactGA.initialize(Env.VITE_GA_MEASUREMENT_ID);
ReactGA.send({ hitType: "pageview" });

const root = document.getElementById("root");
assert(root);

createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<PostHogProvider client={posthog}>
			<ChangelogProvider>
				<Routes />
			</ChangelogProvider>
		</PostHogProvider>
	</QueryClientProvider>,
);
