import { QueryClientProvider } from "@tanstack/react-query";
import { Component, type PropsWithChildren } from "react";
import { createRoot } from "react-dom/client";
import ReactGA from "react-ga4";

import { Routes } from "~/pages/routes";
import { Env } from "~/shared/env";
import { assert } from "~/shared/lib/assert";
import { queryClient } from "~/shared/lib/query";
import { Center, TooltipProvider } from "~/shared/ui";
import "~/globals.css";

ReactGA.initialize(Env.VITE_GA_MEASUREMENT_ID);

// Without it, any render error (Google Translate rewriting the page is a common one) leaves
// a blank screen. React still logs the error itself.
class ErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	render() {
		if (!this.state.hasError) return this.props.children;

		return (
			<Center className="min-h-dvh flex-col gap-4 px-4 text-center">
				<h1 className="text-2xl">Something went wrong.</h1>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="text-primary-foreground"
				>
					Reload the page
				</button>
			</Center>
		);
	}
}

const root = document.getElementById("root");
assert(root);

createRoot(root).render(
	<ErrorBoundary>
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<Routes />
			</TooltipProvider>
		</QueryClientProvider>
	</ErrorBoundary>,
);
