import { error } from '@sveltejs/kit';
import { descriptionToText } from '$lib/server/sanitize';
import { getNews } from '$lib/server/news';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const post = await getNews(platform!.env.DB, params.id);
	if (!post) error(404, 'News post not found');

	// Drafts are admin-only previews; everyone else gets a 404.
	const isAdmin = locals.user?.role === 'admin';
	if (post.published !== 1 && !isAdmin) error(404, 'News post not found');

	return {
		post,
		canEdit: isAdmin,
		excerpt: descriptionToText(post.body).slice(0, 200)
	};
};
