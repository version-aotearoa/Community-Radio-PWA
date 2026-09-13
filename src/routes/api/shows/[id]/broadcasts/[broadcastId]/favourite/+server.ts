import { json } from '@sveltejs/kit';
import { resolveBroadcastForShow } from '$lib/server/shows';
import type { RequestHandler } from './$types';

/** Per-user favourite state + public count for a recording. */
async function favouriteState(db: D1Database, userId: string, broadcastId: string) {
	const mine = await db
		.prepare('SELECT 1 FROM favourite_broadcast WHERE user_id = ? AND broadcast_id = ?')
		.bind(userId, broadcastId)
		.first();
	const total = await db
		.prepare('SELECT COUNT(*) AS n FROM favourite_broadcast WHERE broadcast_id = ?')
		.bind(broadcastId)
		.first();
	return { favourited: Boolean(mine), count: Number(total?.n ?? 0) };
}

/** Signed-in user's favourite state for a recording (episode). */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'sign-in-required' }, { status: 401 });

	const db = platform!.env.DB;
	const broadcast = await resolveBroadcastForShow(db, params.id, params.broadcastId);
	if (!broadcast) return json({ error: 'Not found' }, { status: 404 });
	return json(await favouriteState(db, user.id, broadcast.id));
};

/** Toggle the signed-in user's favourite for a recording (episode). */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'sign-in-required' }, { status: 401 });

	const db = platform!.env.DB;
	const broadcast = await resolveBroadcastForShow(db, params.id, params.broadcastId);
	if (!broadcast) return json({ error: 'Not found' }, { status: 404 });
	const broadcastId = broadcast.id;

	const existing = await db
		.prepare('SELECT 1 FROM favourite_broadcast WHERE user_id = ? AND broadcast_id = ?')
		.bind(user.id, broadcastId)
		.first();

	if (existing) {
		await db
			.prepare('DELETE FROM favourite_broadcast WHERE user_id = ? AND broadcast_id = ?')
			.bind(user.id, broadcastId)
			.run();
	} else {
		await db
			.prepare(
				'INSERT INTO favourite_broadcast (user_id, broadcast_id, created_at) VALUES (?, ?, ?)'
			)
			.bind(user.id, broadcastId, Math.floor(Date.now() / 1000))
			.run();
	}

	return json(await favouriteState(db, user.id, broadcastId));
};
