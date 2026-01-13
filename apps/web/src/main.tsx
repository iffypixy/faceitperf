import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import ReactGA from "react-ga4";

import { ChangelogProvider } from "~/features/changelog";
import { Routes } from "~/pages/routes";
import { Env } from "~/shared/env";
import { assert } from "~/shared/lib/assert";
import { queryClient } from "~/shared/lib/query";
import "~/globals.css";

ReactGA.initialize(Env.VITE_GA_MEASUREMENT_ID);
ReactGA.send({ hitType: "pageview" });

const root = document.getElementById("root");
assert(root);

createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<ChangelogProvider>
			<Routes />
		</ChangelogProvider>
	</QueryClientProvider>,
);
