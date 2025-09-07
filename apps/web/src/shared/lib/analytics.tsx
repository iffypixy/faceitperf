import { useEffect } from "react";
import ReactGA from "react-ga4";
import { Env } from "@shared/env";

export const GoogleAnalytics: React.FC<React.PropsWithChildren> = ({ children }) => {
	useEffect(() => {
		ReactGA.initialize(Env.VITE_GA_MEASUREMENT_ID);
		ReactGA.send({ hitType: "pageview" });
	}, []);

	return children;
};
