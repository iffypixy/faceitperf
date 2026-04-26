export async function onRequest({ params }) {
	const res = await fetch(
		`https://api.faceit.com/democracy/v1/match/${encodeURIComponent(params.matchId)}/history`,
	);
	return new Response(res.body, {
		status: res.status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}
