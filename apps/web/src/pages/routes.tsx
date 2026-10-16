import { useEffect, useRef } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { ProfileSearch } from "~/features/profile";
import { useScrollRestoration } from "~/shared/lib/history-state";
import { translate } from "~/shared/lib/language";
import { useDocumentTitle } from "~/shared/lib/use-document-title";
import { Center, ContentTemplate } from "~/shared/ui";
import { MatchPage } from "./match";

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

const t = translate({
	en: {
		title: "Page not found",
		heading: "This page doesn't exist.",
		search: "Search for a player",
	},
	ru: {
		title: "Страница не найдена",
		heading: "Такой страницы нет.",
		search: "Найти игрока",
	},
});

const NotFoundPage: React.FC = () => {
	useDocumentTitle(t.title);

	return (
		<ContentTemplate>
			<Center className="flex-col gap-4 px-4 text-center">
				<h1 className="text-2xl">{t.heading}</h1>
				<Link href="/" className="text-primary-foreground">
					{t.search}
				</Link>
			</Center>
		</ContentTemplate>
	);
};
