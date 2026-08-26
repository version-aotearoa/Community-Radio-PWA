import { json } from '@sveltejs/kit';
import { verifyTurnstile } from '$lib/server/turnstile';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	const body = (await request.json()) as { token?: string };
	const ok = await verifyTurnstile(
		platform!.env,
		body.token,
		'login',
		getClientAddress()
	);
	if (!ok) return json({ ok: false }, { status: 403 });
	return json({ ok: true });
};
