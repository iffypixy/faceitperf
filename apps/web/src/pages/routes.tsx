import { Route, Switch } from "wouter";

import { MatchPage } from "./match";
import { ProfileSearch } from "@features/profile";

export const Routes: React.FC = () => (
	<Switch>
		<Route path="/" component={ProfileSearch} />
		<Route path="/players/:username" component={ProfileSearch} />
		<Route path="/matches/:matchId" component={MatchPage} />
	</Switch>
);
