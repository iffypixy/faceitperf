import {Route, Switch} from "wouter";

import {HomePage} from "./home";
import {ProfilePage} from "./profile";
import {MatchPage} from "./match";

export const Routes: React.FC = () => (
	<Switch>
		<Route path="/" component={HomePage} />
		<Route path="/@/:username" component={ProfilePage} />
		<Route path="/match/:matchId" component={MatchPage} />
	</Switch>
);
