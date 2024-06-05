import {createRoot} from "react-dom/client";
import {QueryClientProvider} from "@tanstack/react-query";

import {queryClient} from "@shared/lib/query";
import {TooltipProvider} from "@shared/ui";
import {GaAnalytics} from "@shared/lib/analytics";

import {App} from "./app";

import "./index.css";

const root = document.getElementById("root")!;

createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<GaAnalytics>
			<TooltipProvider delayDuration={50}>
				<App />
			</TooltipProvider>
		</GaAnalytics>
	</QueryClientProvider>,
);
