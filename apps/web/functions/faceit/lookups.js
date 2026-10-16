// The players looked up on faceitperf, newest first, for the home page's live feed. The search box
// adds to it; a player looked up again moves back to the top. Only the shown players are kept, so
// every read scans a table that small. It needs a D1 database bound to the project as DB.
const FeedSize = 50;

// In each batch, so a new database needs no setup beyond the binding.
const CreateTable = `CREATE TABLE IF NOT EXISTS lookups (
	player_id TEXT PRIMARY KEY,
	nickname TEXT NOT NULL,
	country TEXT NOT NULL,
	looked_up_at INTEGER NOT NULL
)`;

export async function onRequestGet({ env }) {
	const [, { results }] = await env.DB.batch([
		env.DB.prepare(CreateTable),
		env.DB.prepare(
			"SELECT player_id, nickname, country, looked_up_at FROM lookups ORDER BY looked_up_at DESC",
		),
	]);
	return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
	const { playerId } = await request.json().catch(() => ({}));
	if (typeof playerId !== "string" || !/^[0-9a-f-]{36}$/.test(playerId))
		return new Response(null, { status: 400 });

	// The feed shows FACEIT's own spelling and flag, never text a visitor sent.
	const res = await fetch(`https://open.faceit.com/data/v4/players/${playerId}`, {
		headers: { Authorization: `Bearer ${env.VITE_FACEIT_API_KEY}` },
	});
	if (!res.ok) return new Response(null, { status: res.status === 404 ? 404 : 502 });
	const { nickname, country } = await res.json();

	await env.DB.batch([
		env.DB.prepare(CreateTable),
		env.DB.prepare(
			`INSERT INTO lookups VALUES (?1, ?2, ?3, ?4)
			ON CONFLICT (player_id) DO UPDATE SET nickname = ?2, country = ?3, looked_up_at = ?4`,
		).bind(playerId, nickname, country, Date.now()),
		env.DB.prepare(
			"DELETE FROM lookups WHERE player_id NOT IN (SELECT player_id FROM lookups ORDER BY looked_up_at DESC LIMIT ?)",
		).bind(FeedSize),
	]);
	return new Response(null, { status: 204 });
}
