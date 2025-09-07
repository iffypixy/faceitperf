import ky from "ky";

import { Env } from "./env";

export const api = ky.create();
export const faceitApi = ky.create({
	prefixUrl: Env.VITE_FACEIT_API_URL,
	headers: {
		Authorization: `Bearer ${Env.VITE_FACEIT_API_KEY}`,
	},
});

export const FaceitQueryLimit = 100;
