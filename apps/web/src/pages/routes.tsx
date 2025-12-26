import { Route, Switch } from "wouter";
import { ProfileSearch } from "~/features/profile";
import { MatchPage } from "./match";

export const Routes: React.FC = () => (
	<Switch>
		<Route path="/" component={ProfileSearch} />
		<Route path="/players/:username" component={ProfileSearch} />
		<Route path="/matches/:matchId" component={MatchPage} />
	</Switch>
);
