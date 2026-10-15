// FACEIT's public API names a match's server only through the teams' server vote, and since late
// July 2026 the EU, NA and SEA queues assign the server without one. FACEIT's own match API still
// names it, but it turns away clients that don't look like a browser and sends no CORS headers,
// hence this proxy. It answers with just the server's id, like { "location": "Germany" }.
export async function onRequest({ params }) {
	const res = await fetch(
		`https://api.faceit.com/match/v2/match/${encodeURIComponent(params.matchId)}`,
		{
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
			},
		},
	);
	if (!res.ok) return new Response(null, { status: res.status });

	const location = (await res.json()).payload?.locations?.[0]?.guid;
	if (!location) return new Response(null, { status: 404 });

	// A finished match's server never changes.
	return Response.json(
		{ location },
		{ headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
	);
}
