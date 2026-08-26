import { requireDj } from '$lib/server/guard';
import { getShowsForDj } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireDj(locals, '/studio');
	const shows = await getShowsForDj(platform!.env.DB, user.id);
	return { user, shows };
};
