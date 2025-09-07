/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{html,tsx,ts,jsx,js}"],
	theme: {
		extend: {
			colors: {
				background: {
					DEFAULT: "#090909",
					light: "#1a1c20",
					foreground: "#e4e4e7",
				},
				muted: {
					DEFAULT: "#27272a",
					foreground: "#a1a1aa",
				},
				brand: {
					faceit: "#ff5500",
					hltv: "#2b6ea4",
				},
				primary: {
					DEFAULT: "#2A3641",
					foreground: "#9ec8f1",
				},
				border: "#4b535c",
				error: "#fb7185",
			},
			backgroundImage: {
				"card-gradient": "linear-gradient(136deg, #1b1f23, #3a4755)",
				"faceit-hltv-gradient": "linear-gradient(to right, #ff5500, #2b6ea4)",
			},
		},
		screens: {
			xl: { max: "1536px" },
			lg: { max: "1280px" },
			md: { max: "1024px" },
			sm: { max: "768px" },
			xs: { max: "480px" },
		},
	},
	plugins: [require("tailwindcss-animate")],
};
