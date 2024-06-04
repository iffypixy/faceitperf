/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{html,tsx,ts,jsx,js}"],
	theme: {
		extend: {
			colors: {
				fixed: {
					faceit: "#ff5500",
					hltv: "#2b6ea4",
					profile: "#2b343d",
				},
				paper: {
					DEFAULT: "#212121",
					contrast: "#ffffff",
				},
			},
		},
		screens: {
			xl: {max: "1400px"},
			lg: {max: "1280px"},
			md: {max: "1012px"},
			sm: {max: "768px"},
			xs: {max: "544px"},
		},
		spacing: mapToRem([
			0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34,
			36, 38, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96,
			100, 116, 132, 148, 164, 180, 196, 260, 324, 388,
		]),
		fontSize: mapToRem([
			0, 8, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34,
			36, 38, 40, 44, 48, 52, 56, 60, 72, 84,
		]),
		borderRadius: {
			...mapToRem([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32]),
			full: "99999px",
		},
		fontFamily: {
			unbounded: '"Unbounded", sans-serif',
		},
		backgroundImage: {
			profile: "linear-gradient(136deg, #1b1f23, #3a4755)",
		},
	},
	plugins: [require("tailwindcss-animate")],
};

function mapToRem(sizes) {
	return sizes.reduce((prev, size) => {
		prev[size] = `${size / 10}rem`;

		return prev;
	}, {});
}
