import { attachHearts, heartKeyOf, listNews, VR_ANON_COOKIE } from '$lib/server/news';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, cookies }) => {
	const posts = await listNews(platform!.env.DB, true);
	const key = heartKeyOf(locals.user?.id ?? null, cookies.get(VR_ANON_COOKIE) ?? null);
	return { posts: await attachHearts(platform!.env.DB, posts, key) };
};
