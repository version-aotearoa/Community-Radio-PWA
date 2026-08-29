import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Signed-in user's bookmark state for a recording (episode). */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'sign-in-required' }, { status: 401 });

	const db = platform!.env.DB;
	const existing = await db
		.prepare('SELECT 1 FROM saved_episode WHERE user_id = ? AND broadcast_id = ?')
		.bind(user.id, params.broadcastId)
		.first();
	return json({ saved: Boolean(existing) });
};

/** Toggle the signed-in user's bookmark for a recording (episode). */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'sign-in-required' }, { status: 401 });

	const db = platform!.env.DB;
	const { broadcastId } = params;

	const existing = await db
		.prepare('SELECT 1 FROM saved_episode WHERE user_id = ? AND broadcast_id = ?')
		.bind(user.id, broadcastId)
		.first();

	if (existing) {
		await db
			.prepare('DELETE FROM saved_episode WHERE user_id = ? AND broadcast_id = ?')
			.bind(user.id, broadcastId)
			.run();
		return json({ saved: false });
	}

	await db
		.prepare('INSERT INTO saved_episode (user_id, broadcast_id, created_at) VALUES (?, ?, ?)')
		.bind(user.id, broadcastId, Math.floor(Date.now() / 1000))
		.run();
	return json({ saved: true });
};
