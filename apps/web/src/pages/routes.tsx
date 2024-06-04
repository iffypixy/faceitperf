import {Route, Switch} from "wouter";

import {HomePage} from "./home";
import {ProfilePage} from "./profile";

export const Routes: React.FC = () => (
	<Switch>
		<Route path="/" component={HomePage} />
		<Route path="/@/:username" component={ProfilePage} />
	</Switch>
);
