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
	// saved_episode.broadcast_id references broadcast.id (FK, ON UPDATE NO
	// ACTION). D1 forbids `PRAGMA foreign_keys = OFF`, but supports
	// `PRAGMA defer_foreign_keys = on`: checks are deferred to the end of
	// this (single implicit) transaction, by which point the bookmark rows
	// point at the renamed id. All three statements must share one exec.
	const esc = (s: string) => s.replace(/'/g, "''");
	try {
		await db.exec(`
			PRAGMA defer_foreign_keys = on;
			UPDATE broadcast SET id = '${esc(slug)}', updated_at = ${t} WHERE id = '${esc(broadcast.id)}';
			UPDATE track SET broadcast_id = '${esc(slug)}' WHERE broadcast_id = '${esc(broadcast.id)}';
			UPDATE saved_episode SET broadcast_id = '${esc(slug)}' WHERE broadcast_id = '${esc(broadcast.id)}';
		`);
	} catch (e) {
		console.error('[slug] rename failed:', e);
		return json({ error: 'Could not rename episode' }, { status: 500 });
	}

	return json({ id: slug });
};
