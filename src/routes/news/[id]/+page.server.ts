import { error } from '@sveltejs/kit';
import { descriptionToText } from '$lib/server/sanitize';
import { getNews, heartCounts, heartKeyOf, myHeart, VR_ANON_COOKIE } from '$lib/server/news';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform, cookies }) => {
	const post = await getNews(platform!.env.DB, params.id);
	if (!post) error(404, 'News post not found');

	// Drafts are admin-only previews; everyone else gets a 404.
	const isAdmin = locals.user?.role === 'admin';
	if (post.published !== 1 && !isAdmin) error(404, 'News post not found');

	const key = heartKeyOf(locals.user?.id ?? null, cookies.get(VR_ANON_COOKIE) ?? null);
	const [heartCount, my] = await Promise.all([
		heartCounts(platform!.env.DB, [post.id]).then((c) => c[post.id] ?? 0),
		myHeart(platform!.env.DB, post.id, key)
	]);

	return {
		post,
		canEdit: isAdmin,
		excerpt: descriptionToText(post.body).slice(0, 200),
		heartCount,
		myHeart: my
	};
};
