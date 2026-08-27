import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TTL_SECONDS = 600;

function b64url(s: string): string {
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacHex(payload: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
	return [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Issue a short-lived, signed chat identity for the signed-in caller.
 * Payload: base64url(JSON { uid, name, exp }) + '.' + HMAC-SHA256 hex,
 * verified by the chat worker with the shared CHAT_IDENTITY_SECRET.
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	const user = locals.user;
	const secret = platform?.env.CHAT_IDENTITY_SECRET;
	if (!user || !secret) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const payload = b64url(
		JSON.stringify({
			uid: user.id,
			name: user.name || user.email,
			exp: Math.floor(Date.now() / 1000) + TTL_SECONDS
		})
	);
	const sig = await hmacHex(payload, secret);
	const name = user.name || user.email;

	return json({ token: `${payload}.${sig}`, name });
};
