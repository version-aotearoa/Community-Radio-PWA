import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const env = platform!.env;
	const chatUrl = env.PUBLIC_CHAT_URL;
	const token = env.CHAT_ADMIN_TOKEN;
	if (!chatUrl || !token) return json({ error: 'Chat moderation not configured' }, { status: 503 });
	const body = (await request.json()) as { name?: string; userId?: string };
	if (!body.name && !body.userId) return json({ error: 'name or userId is required' }, { status: 400 });
	const res = await fetch(`${chatUrl}/api/messages/purge`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({ name: body.name, userId: body.userId })
	});
	if (!res.ok) return json({ error: 'Chat unavailable' }, { status: 502 });
	return json({ ok: true });
};
