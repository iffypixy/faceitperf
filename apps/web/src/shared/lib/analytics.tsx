import {useEffect} from "react";
import ReactGA from "react-ga4";

export const GaAnalytics: React.FC<React.PropsWithChildren> = ({children}) => {
	useEffect(() => {
		ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);

		ReactGA.send({
			hitType: "pageview",
		});
	}, []);

	return children;
};
