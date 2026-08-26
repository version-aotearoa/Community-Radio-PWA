import { json } from '@sveltejs/kit';
import { getBroadcast, getShow, setBroadcastReplayUrl, type BroadcastRow } from '$lib/server/shows';
import type { RequestHandler } from './$types';

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

export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const db = platform!.env.DB;
	const auth = await authorize(params, locals.user, db);
	if (!auth.ok) return json({ error: auth.error }, { status: auth.status });

	const body = (await request.json()) as { url?: unknown };
	const url = body.url === null || body.url === '' || body.url === undefined ? null : body.url;
	if (url !== null && typeof url !== 'string') {
		return json({ error: 'url must be a string' }, { status: 400 });
	}

	const replayUrl = await setBroadcastReplayUrl(db, auth.broadcast.id, url ?? null);
	if (url && !replayUrl) {
		return json(
			{ error: 'Paste a track id (24 hex chars) or an on-demand download link.' },
			{ status: 400 }
		);
	}
	return json({ replayUrl });
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	const db = platform!.env.DB;
	const auth = await authorize(params, locals.user, db);
	if (!auth.ok) return json({ error: auth.error }, { status: auth.status });

	const replayUrl = await setBroadcastReplayUrl(db, auth.broadcast.id, null);
	return json({ replayUrl });
};
