import zod from "zod";

const EnvSchema = zod.object({
	VITE_FACEIT_API_URL: zod.url(),
	VITE_FACEIT_API_KEY: zod.string(),
	VITE_GA_MEASUREMENT_ID: zod.string(),
	VITE_STEAM_WEB_API_KEY: zod.string(),
	VITE_PUBLIC_POSTHOG_KEY: zod.string(),
	VITE_PUBLIC_POSTHOG_HOST: zod.url(),
});

export const Env = EnvSchema.parse(import.meta.env);
