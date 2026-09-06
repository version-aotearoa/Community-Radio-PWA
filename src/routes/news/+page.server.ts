import { listNews } from '$lib/server/news';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	return { posts: await listNews(platform!.env.DB, true) };
};
