import { json } from '@sveltejs/kit';
import {
	getBroadcast,
	getShow,
	getTracklist,
	replaceTracklist
} from '$lib/server/shows';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform }) => {
	const broadcast = await getBroadcast(platform!.env.DB, params.broadcastId);
	if (!broadcast || broadcast.show_id !== params.id) {
		return json({ error: 'Not found' }, { status: 404 });
	}
	const tracks = await getTracklist(platform!.env.DB, broadcast.id);
	return json(tracks);
};

export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const user = locals.user ?? null;
	if (!user || (user.role !== 'dj' && user.role !== 'admin')) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const show = await getShow(platform!.env.DB, params.id);
	if (!show) return json({ error: 'Not found' }, { status: 404 });
	if (show.dj_id !== user.id && user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const broadcast = await getBroadcast(platform!.env.DB, params.broadcastId);
	if (!broadcast || broadcast.show_id !== show.id) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const body = (await request.json()) as { tracks?: Array<{ title?: string; artist?: string; album?: string }> };
	if (!Array.isArray(body.tracks)) {
		return json({ error: 'tracks must be an array' }, { status: 400 });
	}
	const filtered = body.tracks
		.map((t) => ({ title: String(t.title ?? ''), artist: String(t.artist ?? ''), album: String(t.album ?? '') }))
		.filter((t) => t.title !== '');

	const tracks = await replaceTracklist(platform!.env.DB, broadcast.id, filtered);
	return json(tracks);
};
