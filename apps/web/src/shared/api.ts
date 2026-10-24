import ky from "ky";

import { Env } from "./env";

export const api = ky.create({
	hooks: {
		// Every call to our Functions counts against the free plan's daily cap, which crawlers that
		// render the app would spend on every page they open. Their browsers set `navigator.webdriver`.
		beforeRequest: [() => (navigator.webdriver ? new Response(null, { status: 403 }) : undefined)],
	},
});

export const faceitApi = ky.create({
	prefixUrl: Env.VITE_FACEIT_API_URL,
	headers: {
		Authorization: `Bearer ${Env.VITE_FACEIT_API_KEY}`,
	},
});

export const FaceitQueryLimit = 100;
