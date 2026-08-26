import {
	cycleWeekOf,
	ensureBroadcasts,
	getAllShows,
	getUpcomingBroadcasts,
	todayStr
} from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform!.env.DB;

	// Materialise upcoming broadcasts for every active show (idempotent).
	for (const show of await getAllShows(db)) {
		await ensureBroadcasts(db, show, 12);
	}

	return {
		upcoming: await getUpcomingBroadcasts(db, 30),
		cycleWeek: cycleWeekOf(todayStr()),
		today: todayStr()
	};
};
