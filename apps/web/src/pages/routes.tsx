import { useEffect, useRef } from "react";
import { Route, Switch, useLocation } from "wouter";
import { ProfileSearch } from "~/features/profile";
import { useScrollRestoration } from "~/shared/lib/history-state";
import { MatchPage } from "./match";
import { NotFoundPage } from "./not-found";

export const Routes: React.FC = () => {
	useScrollRestoration();
	useFocusOnNavigation();

	return (
		<Switch>
			<Route path="/" component={ProfileSearch} />
			<Route path="/players/:username" component={ProfileSearch} />
			<Route path="/matches/:matchId" component={MatchPage} />
			<Route component={NotFoundPage} />
		</Switch>
	);
};

// A link that took you to another page is gone with the old one, so focus would fall back to the
// document and the next Tab would restart at the header. It moves to the new page instead, unless
// the page has focused something itself (the home page's search field).
function useFocusOnNavigation() {
	const [location] = useLocation();
	const isFirstPage = useRef(true);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs on every navigation, which `location` marks
	useEffect(() => {
		if (isFirstPage.current) {
			isFirstPage.current = false;
			return;
		}

		const main = document.querySelector("main");
		if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
	}, [location]);
}
