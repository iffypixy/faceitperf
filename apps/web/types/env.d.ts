/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_FACEIT_API_URL: string;
	readonly VITE_FACEIT_API_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
