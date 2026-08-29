import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Signed-in user's follow state for a show. */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'sign-in-required' }, { status: 401 });

	const db = platform!.env.DB;
	const existing = await db
		.prepare('SELECT 1 FROM follow_show WHERE user_id = ? AND show_id = ?')
		.bind(user.id, params.id)
		.first();
	return json({ following: Boolean(existing) });
};

/** Toggle the signed-in user's follow for a show. */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'sign-in-required' }, { status: 401 });

	const db = platform!.env.DB;
	const { id } = params;

	const existing = await db
		.prepare('SELECT 1 FROM follow_show WHERE user_id = ? AND show_id = ?')
		.bind(user.id, id)
		.first();

	if (existing) {
		await db
			.prepare('DELETE FROM follow_show WHERE user_id = ? AND show_id = ?')
			.bind(user.id, id)
			.run();
		return json({ following: false });
	}

	await db
		.prepare('INSERT INTO follow_show (user_id, show_id, created_at) VALUES (?, ?, ?)')
		.bind(user.id, id, Math.floor(Date.now() / 1000))
		.run();
	return json({ following: true });
};
