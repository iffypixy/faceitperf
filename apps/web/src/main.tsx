import {createRoot} from "react-dom/client";
import {QueryClientProvider} from "@tanstack/react-query";

import {queryClient} from "@shared/lib/query";

import {App} from "./app";

import "./index.css";

const root = document.getElementById("root")!;

createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>,
);
