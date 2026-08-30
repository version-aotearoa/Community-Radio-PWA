import { json } from '@sveltejs/kit';
import { getBroadcast, getShow } from '$lib/server/shows';
import type { RequestHandler } from './$types';

async function authorize(
	params: { id: string; broadcastId: string },
	user: App.Locals['user'],
	db: D1Database
): Promise<{ ok: false; status: number } | { ok: true; broadcastId: string }> {
	if (!user || (user.role !== 'dj' && user.role !== 'admin')) {
		return { ok: false, status: 403 };
	}
	const show = await getShow(db, params.id);
	if (!show) return { ok: false, status: 404 };
	if (show.dj_id !== user.id && user.role !== 'admin') {
		return { ok: false, status: 403 };
	}
	const broadcast = await getBroadcast(db, params.broadcastId);
	if (!broadcast || broadcast.show_id !== show.id) {
		return { ok: false, status: 404 };
	}
	return { ok: true, broadcastId: broadcast.id };
}

export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const db = platform!.env.DB;
	const auth = await authorize(params, locals.user, db);
	if (!auth.ok) return json({ error: 'Forbidden' }, { status: auth.status });

	const body = (await request.json()) as { description?: unknown };
	if (typeof body.description !== 'string') {
		return json({ error: 'description must be a string' }, { status: 400 });
	}
	const description = body.description.trim().slice(0, 2000);
	await db
		.prepare('UPDATE broadcast SET description = ?, updated_at = ? WHERE id = ?')
		.bind(description, Math.floor(Date.now() / 1000), auth.broadcastId)
		.run();
	return json({ description });
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	const db = platform!.env.DB;
	const auth = await authorize(params, locals.user, db);
	if (!auth.ok) return json({ error: 'Forbidden' }, { status: auth.status });
	await db
		.prepare('UPDATE broadcast SET description = \'\', updated_at = ? WHERE id = ?')
		.bind(Math.floor(Date.now() / 1000), auth.broadcastId)
		.run();
	return json({ description: '' });
};
