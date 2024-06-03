declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV: string;
			PORT: string;
			CLIENT_ORIGIN: string;
			FACEIT_API_URL: string;
			FACEIT_API_KEY: string;
		}
	}
}

export {};
