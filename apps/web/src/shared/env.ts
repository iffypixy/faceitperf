// Each variable is read by name: a bare `import.meta.env` makes Vite inline
// every VITE_* variable it finds into the public bundle.
export const Env = {
	VITE_FACEIT_API_URL: required("VITE_FACEIT_API_URL", import.meta.env.VITE_FACEIT_API_URL),
	VITE_FACEIT_API_KEY: required("VITE_FACEIT_API_KEY", import.meta.env.VITE_FACEIT_API_KEY),
	VITE_GA_MEASUREMENT_ID: required(
		"VITE_GA_MEASUREMENT_ID",
		import.meta.env.VITE_GA_MEASUREMENT_ID,
	),
};

function required(name: string, value: string | undefined): string {
	if (!value) throw new Error(`missing env variable: ${name}`);
	return value;
}
