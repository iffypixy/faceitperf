import axios, {AxiosInstance} from "axios";

import {Nullable} from "./types";

export const request: {
	client: Nullable<AxiosInstance>;
	setUp(): void;
} = {
	client: null,
	setUp() {
		this.client = axios.create({
			baseURL: process.env.FACEIT_API_URL,
			headers: {
				Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
			},
		});
	},
};
