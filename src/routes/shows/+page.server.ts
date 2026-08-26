import { getSchedule } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	return { shows: await getSchedule(platform!.env.DB) };
};
