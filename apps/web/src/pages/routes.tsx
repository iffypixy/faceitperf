import { Link, Route, Switch } from "wouter";
import { ProfileSearch } from "~/features/profile";
import { useDocumentTitle } from "~/shared/lib/use-document-title";
import { Center, ContentTemplate } from "~/shared/ui";
import { MatchPage } from "./match";

export const Routes: React.FC = () => (
	<Switch>
		<Route path="/" component={ProfileSearch} />
		<Route path="/players/:username" component={ProfileSearch} />
		<Route path="/matches/:matchId" component={MatchPage} />
		<Route component={NotFoundPage} />
	</Switch>
);
const NotFoundPage: React.FC = () => {
	useDocumentTitle("Page not found");

	return (
		<ContentTemplate>
			<Center className="flex-col gap-4 px-4 text-center">
				<h1 className="text-2xl">This page doesn't exist.</h1>
				<Link href="/" className="text-primary-foreground">
					Search for a player
				</Link>
			</Center>
		</ContentTemplate>
	);
};
