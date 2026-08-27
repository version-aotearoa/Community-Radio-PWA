import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const chatUrl = platform?.env.PUBLIC_CHAT_URL;
	if (!chatUrl) return json({ error: 'Chat not configured' }, { status: 503 });
	const res = await fetch(`${chatUrl}/api/history`);
	if (!res.ok) return json({ error: 'Chat unavailable' }, { status: 502 });
	const data = (await res.json()) as { messages: unknown[] };
	return json(data.messages);
};
