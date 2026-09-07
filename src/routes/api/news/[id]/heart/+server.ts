import { json } from '@sveltejs/kit';
import { getNews, heartKeyOf, toggleHeart, VR_ANON_COOKIE } from '$lib/server/news';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, cookies, url, platform }) => {
	const post = await getNews(platform!.env.DB, params.id);
	if (!post) return json({ error: 'Not found' }, { status: 404 });

	const user = locals.user;
	let anon = cookies.get(VR_ANON_COOKIE);
	if (!user && !anon) anon = crypto.randomUUID();

	const key = heartKeyOf(user?.id ?? null, anon ?? null);
	if (!key) return json({ error: 'Not found' }, { status: 404 });

	const result = await toggleHeart(platform!.env.DB, params.id, key);

	// First anonymous heart: persist the device key so the state survives reload.
	if (!user && anon) {
		cookies.set(VR_ANON_COOKIE, anon, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	return json(result);
};
