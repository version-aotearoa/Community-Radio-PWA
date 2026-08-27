import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const env = platform!.env;
	const chatUrl = env.PUBLIC_CHAT_URL;
	const token = env.CHAT_ADMIN_TOKEN;
	if (!chatUrl || !token) return json({ error: 'Chat moderation not configured' }, { status: 503 });
	const res = await fetch(`${chatUrl}/api/messages/${encodeURIComponent(params.id)}`, {
		method: 'DELETE',
		headers: { authorization: `Bearer ${token}` }
	});
	if (!res.ok) return json({ error: 'Chat unavailable' }, { status: 502 });
	return json({ ok: true });
};
