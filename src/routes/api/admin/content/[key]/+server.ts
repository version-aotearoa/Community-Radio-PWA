import { json } from '@sveltejs/kit';
import { clearContent, isContentKey, setContent } from '$lib/server/content';
import { DESCRIPTION_MAX, sanitizeDescription } from '$lib/server/sanitize';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	if (!isContentKey(params.key)) return json({ error: 'Unknown content key' }, { status: 400 });

	const body = (await request.json()) as { body?: unknown };
	if (typeof body.body !== 'string') {
		return json({ error: 'body must be a string' }, { status: 400 });
	}

	const clean = sanitizeDescription(body.body).slice(0, DESCRIPTION_MAX);
	await setContent(platform!.env.DB, params.key, clean);
	return json({ ok: true, body: clean });
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	if (!isContentKey(params.key)) return json({ error: 'Unknown content key' }, { status: 400 });

	await clearContent(platform!.env.DB, params.key);
	return json({ ok: true, body: '' });
};
