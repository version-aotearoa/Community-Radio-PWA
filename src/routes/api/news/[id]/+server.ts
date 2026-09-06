import { json } from '@sveltejs/kit';
import { deleteNews, getNews, updateNews } from '$lib/server/news';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

	const body = (await request.json()) as {
		title?: unknown;
		body?: unknown;
		image?: unknown;
		published?: unknown;
	};
	const input: { title?: string; body?: string; image?: string | null; published?: boolean } = {};
	if (body.title !== undefined) {
		if (typeof body.title !== 'string') return json({ error: 'title must be a string' }, { status: 400 });
		if (!body.title.trim()) return json({ error: 'Give the post a title.' }, { status: 400 });
		input.title = body.title;
	}
	if (body.body !== undefined) {
		if (typeof body.body !== 'string') return json({ error: 'body must be a string' }, { status: 400 });
		input.body = body.body;
	}
	if (body.image !== undefined) {
		if (body.image !== null && typeof body.image !== 'string') {
			return json({ error: 'image must be a string' }, { status: 400 });
		}
		input.image = body.image === null ? null : (body.image as string);
	}
	if (body.published !== undefined) {
		if (typeof body.published !== 'boolean') {
			return json({ error: 'published must be a boolean' }, { status: 400 });
		}
		input.published = body.published;
	}

	const updated = await updateNews(platform!.env.DB, params.id, input);
	if (!updated) return json({ error: 'Not found' }, { status: 404 });
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const existing = await getNews(platform!.env.DB, params.id);
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	await deleteNews(platform!.env.DB, params.id);
	return json({ ok: true });
};
