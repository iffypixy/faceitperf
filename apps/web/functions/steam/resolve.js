export async function onRequest({ request, env }) {
	const vanityurl = new URL(request.url).searchParams.get("vanityurl");
	if (!vanityurl) return new Response(null, { status: 400 });
	const res = await fetch(
		`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${env.STEAM_WEB_API_KEY}&vanityurl=${encodeURIComponent(vanityurl)}`,
	);
	return new Response(res.body, {
		status: res.status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}
