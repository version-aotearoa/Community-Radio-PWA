import { json } from '@sveltejs/kit';
import { getBroadcast, getShow } from '$lib/server/shows';
import type { RequestHandler } from './$types';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const user = locals.user;
	if (!user || (user.role !== 'dj' && user.role !== 'admin')) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	const db = platform!.env.DB;

	const show = await getShow(db, params.id);
	if (!show) return json({ error: 'Not found' }, { status: 404 });
	if (show.dj_id !== user.id && user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	const broadcast = await getBroadcast(db, params.broadcastId);
	if (!broadcast || broadcast.show_id !== show.id) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const body = (await request.json()) as { slug?: unknown };
	const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
	if (!SLUG_RE.test(slug)) {
		return json(
			{ error: 'Use lowercase letters, numbers and hyphens (max 100 chars).' },
			{ status: 400 }
		);
	}
	if (slug === broadcast.id) return json({ id: slug });

	const existing = await db.prepare('SELECT id FROM broadcast WHERE id = ?').bind(slug).first();
	if (existing) return json({ error: 'That ID is already in use.' }, { status: 409 });

	const t = Math.floor(Date.now() / 1000);
	await db.batch([
		db.prepare('UPDATE broadcast SET id = ?, updated_at = ? WHERE id = ?').bind(slug, t, broadcast.id),
		db
			.prepare('UPDATE track SET broadcast_id = ? WHERE broadcast_id = ?')
			.bind(slug, broadcast.id),
		db
			.prepare('UPDATE saved_episode SET broadcast_id = ? WHERE broadcast_id = ?')
			.bind(slug, broadcast.id)
	]);

	return json({ id: slug });
};
