import { json } from '@sveltejs/kit';
import { createNews, listNews } from '$lib/server/news';
import type { RequestHandler } from './$types';

/** List all news posts (including drafts) — Studio admin use. */
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const posts = await listNews(platform!.env.DB, false);
	return json(posts);
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

	const body = (await request.json()) as { title?: unknown; body?: unknown; image?: unknown; published?: unknown };
	if (typeof body.title !== 'string' || !body.title.trim()) {
		return json({ error: 'Give the post a title.' }, { status: 400 });
	}
	if (body.body !== undefined && typeof body.body !== 'string') {
		return json({ error: 'body must be a string' }, { status: 400 });
	}
	if (body.image !== undefined && body.image !== null && typeof body.image !== 'string') {
		return json({ error: 'image must be a string' }, { status: 400 });
	}

	const post = await createNews(platform!.env.DB, {
		title: body.title,
		body: typeof body.body === 'string' ? body.body : '',
		image: typeof body.image === 'string' ? body.image : null,
		published: body.published === true
	});
	return json(post, { status: 201 });
};
