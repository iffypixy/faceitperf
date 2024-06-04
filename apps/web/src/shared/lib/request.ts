import axios from "axios";

export const request = axios.create({
	baseURL: import.meta.env.VITE_FACEIT_API_URL,
	headers: {
		Authorization: `Bearer ${import.meta.env.VITE_FACEIT_API_KEY}`,
	},
});
