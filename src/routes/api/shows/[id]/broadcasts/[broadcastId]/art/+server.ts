import { json } from '@sveltejs/kit';
import { getBroadcast, getShow, type BroadcastRow } from '$lib/server/shows';
import type { RequestHandler } from './$types';

const ART_MAX = 500;

interface Authorized {
	ok: true;
	broadcast: BroadcastRow;
}

async function authorize(
	params: { id: string; broadcastId: string },
	user: App.Locals['user'],
	db: D1Database
): Promise<Authorized | { ok: false; status: number; error: string }> {
	if (!user || (user.role !== 'dj' && user.role !== 'admin')) {
		return { ok: false, status: 403, error: 'Forbidden' };
	}

	const show = await getShow(db, params.id);
	if (!show) return { ok: false, status: 404, error: 'Not found' };
	if (show.dj_id !== user.id && user.role !== 'admin') {
		return { ok: false, status: 403, error: 'Forbidden' };
	}

	const broadcast = await getBroadcast(db, params.broadcastId);
	if (!broadcast || broadcast.show_id !== show.id) {
		return { ok: false, status: 404, error: 'Not found' };
	}

	return { ok: true, broadcast };
}

async function setArt(db: D1Database, broadcastId: string, art: string | null): Promise<string | null> {
	await db
		.prepare('UPDATE broadcast SET art = ?, updated_at = ? WHERE id = ?')
		.bind(art, Math.floor(Date.now() / 1000), broadcastId)
		.run();
	return art;
}

export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const db = platform!.env.DB;
	const auth = await authorize(params, locals.user, db);
	if (!auth.ok) return json({ error: auth.error }, { status: auth.status });

	const body = (await request.json()) as { url?: unknown };
	const url = body.url === null || body.url === '' || body.url === undefined ? null : body.url;
	if (url !== null && typeof url !== 'string') {
		return json({ error: 'url must be a string' }, { status: 400 });
	}

	const art = url ? url.trim().slice(0, ART_MAX) : null;
	const saved = await setArt(db, auth.broadcast.id, art);
	return json({ art: saved });
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	const db = platform!.env.DB;
	const auth = await authorize(params, locals.user, db);
	if (!auth.ok) return json({ error: auth.error }, { status: auth.status });

	const art = await setArt(db, auth.broadcast.id, null);
	return json({ art });
};
