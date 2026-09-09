import { requireAdmin } from '$lib/server/guard';
import { getAllShows } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireAdmin(locals, '/studio');
	return { user, shows: await getAllShows(platform!.env.DB) };
};
