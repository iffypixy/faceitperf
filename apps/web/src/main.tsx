import {createRoot} from "react-dom/client";
import {QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "react-hot-toast";

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

		<Toaster
			toastOptions={{
				className:
					"bg-fixed-profile text-paper-contrast/60 p-20 max-w-[48rem] [&>*:nth-child(2)]:mx-12",
			}}
		/>
	</QueryClientProvider>,
);
