import { requireDj } from '$lib/server/guard';
import { getAllShows, getShowsForDj } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireDj(locals, '/studio');
	const shows =
		user.role === 'admin' ? await getAllShows(platform!.env.DB) : await getShowsForDj(platform!.env.DB, user.id);
	return { user, shows };
};
