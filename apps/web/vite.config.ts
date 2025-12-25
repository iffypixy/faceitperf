import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss(), svgr()],
	resolve: {
		alias: {
			"~": "/src",
		},
	},
});
