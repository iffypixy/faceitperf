/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_FACEIT_API_URL: string;
	readonly VITE_FACEIT_API_KEY: string;
	readonly VITE_GA_MEASUREMENT_ID: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
