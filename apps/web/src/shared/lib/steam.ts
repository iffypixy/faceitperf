import axios from "axios";

import {STEAM_WEB_API_KEY} from "@shared/config";

import {Nullable} from "./types";
import {request} from "./request";

export function extractSteamId(
	profileUrl: string,
): Nullable<string | Promise<string>> {
	const steamIdRegex = /https?:\/\/steamcommunity\.com\/profiles\/(\d{17})/;
	const customUrlRegex = /https?:\/\/steamcommunity\.com\/id\/([\w\d_-]+)/;

	const steamIdMatch = steamIdRegex.exec(profileUrl);

	if (steamIdMatch) return steamIdMatch[1];

	const customUrlMatch = customUrlRegex.exec(profileUrl);

	if (customUrlMatch) {
		const customId = customUrlMatch[1];

		return axios({
			method: "GET",
			url: `https://corsproxy.io/?https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_WEB_API_KEY}&vanityurl=${customId}`,
		}).then((res) => {
			if (res.data.response.success === 1) {
				return res.data.response.steamid;
			} else {
				return null;
			}
		});
	}

	return null;
}

export function loadFaceitUsernameBySteamId(
	steamId: string,
): Promise<Nullable<string>> {
	return request({
		method: "GET",
		url: `/players?game=cs2&game_player_id=${steamId}`,
	})
		.then((res) => {
			return res.data.nickname;
		})
		.catch(() => {
			console.log(null);
		});
}

export function isValidSteamProfileUrl(url: string) {
	const steamIdRegex =
		/^https?:\/\/steamcommunity\.com\/profiles\/\d{17}\/?$/;
	const customUrlRegex = /^https?:\/\/steamcommunity\.com\/id\/[\w\d_-]+\/?$/;

	return steamIdRegex.test(url) || customUrlRegex.test(url);
}
