import { addMonths } from "date-fns";
import { aggregatePlayerPerformance } from "../../../src/features/stats";

// A profile's link preview in Telegram, Discord and the like. Their crawlers don't run the app, so
// the photo and stats go into the page's meta tags here. Every Function request counts against the
// daily cap, so a URL rewrite rule in the Cloudflare dashboard sends only those crawlers here:
//   if   starts_with(http.request.uri.path, "/players/") and (http.user_agent contains "TelegramBot"
//        or http.user_agent contains "Discordbot" or http.user_agent contains "vkShare"
//        or http.user_agent contains "WhatsApp" or http.user_agent contains "Twitterbot"
//        or http.user_agent contains "facebookexternalhit" or http.user_agent contains "Slackbot")
//   then rewrite the path to concat("/preview", http.request.uri.path)
export async function onRequest({ request, params, env }) {
	const page = await env.ASSETS.fetch(new URL("/", request.url));

	// Without the player, the page keeps the site's own preview, which beats none.
	const preview = await fetchPreview(params.username, env).catch((err) => {
		console.error(`preview of ${params.username}: ${err.message}`);
		return null;
	});
	if (!preview) return page;

	const { player, maps } = preview;
	const description = describe(player, maps);
	const setContent = (value) => ({ element: (el) => el.setAttribute("content", value) });
	const rewriter = new HTMLRewriter()
		.on("title", { element: (el) => el.setInnerContent(`${player.nickname} — faceitperf`) })
		.on(
			'meta[property="og:url"]',
			setContent(new URL(`/players/${encodeURIComponent(player.nickname)}`, request.url).href),
		)
		.on('meta[property="og:title"]', setContent(player.nickname));

	if (description)
		rewriter
			.on('meta[name="description"]', setContent(description))
			.on('meta[property="og:description"]', setContent(description));

	// The photo shows as a thumbnail beside the text, where the site's wide banner would be.
	if (player.avatar)
		rewriter
			.on('meta[property="og:image"]', setContent(player.avatar))
			.on('meta[property^="og:image:"]', { element: (el) => el.remove() })
			.on('meta[name="twitter:card"]', setContent("summary"));

	const res = new Response(rewriter.transform(page).body, page);
	// The tag names the plain page, and a crawler that cached that one would take this for it.
	res.headers.delete("ETag");
	return res;
}

async function fetchPreview(username, env) {
	const player = await fetchPlayer(username, env);
	if (!player) return null;

	return { player, maps: await fetchLastMonthMaps(player.player_id, env) };
}

// FACEIT's lookup is case-sensitive. A link typed by hand ("s1mple" for "S1mple") gets the same
// spellings the profile tries before its search.
async function fetchPlayer(username, env) {
	const exact = await faceit(`players?nickname=${encodeURIComponent(username)}`, env);
	if (exact) return exact;

	const spellings = new Set([
		username.charAt(0).toUpperCase() + username.slice(1),
		username.toLowerCase(),
		username.toUpperCase(),
	]);
	spellings.delete(username);
	const respelled = await Promise.all(
		[...spellings].map((x) => faceit(`players?nickname=${encodeURIComponent(x)}`, env)),
	);
	return respelled.find((x) => x !== null) ?? null;
}

// The profile's "Last month" filter. The whole history, which the profile opens with, takes
// seconds to download and more CPU than the free plan allows.
async function fetchLastMonthMaps(playerId, env) {
	const start = addMonths(new Date(), -1);
	const maps = [];

	while (true) {
		const to = maps.at(-1)?.["Match Finished At"];
		const { items } = await faceit(
			`players/${playerId}/games/cs2/stats?limit=100&from=${start.getTime()}${to ? `&to=${to}` : ""}`,
			env,
		);
		maps.push(...items.map((x) => x.stats));

		if (items.length < 100) return maps.filter((x) => new Date(x["Created At"]) > start);
	}
}

// Worded and rounded like the profile card.
function describe(player, maps) {
	const game = player.games?.cs2;
	const level = game && `Level ${game.skill_level} · ${game.faceit_elo.toLocaleString("en")} ELO.`;
	if (maps.length === 0) return level;

	const { rating, kd, adr, kast } = aggregatePlayerPerformance(maps);
	const stats = `Last month: ${rating.toFixed(2)} rating, ${kd.toFixed(2)} K/D, ${adr.toFixed(1)} ADR, ${kast.toFixed(1)}% KAST.`;
	return level ? `${level} ${stats}` : stats;
}

async function faceit(path, env) {
	const res = await fetch(`https://open.faceit.com/data/v4/${path}`, {
		headers: { Authorization: `Bearer ${env.VITE_FACEIT_API_KEY}` },
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`FACEIT answered ${res.status} for ${path}`);
	return await res.json();
}
