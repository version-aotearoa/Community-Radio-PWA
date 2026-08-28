import {
	cycleWeekOf,
	ensureBroadcasts,
	getAllShows,
	getUpcomingBroadcasts,
	todayStr,
	zonedNow
} from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform!.env.DB;

	// Materialise upcoming broadcasts for every active show (idempotent).
	for (const show of await getAllShows(db)) {
		await ensureBroadcasts(db, show, 12);
	}

	const now = zonedNow();
	const upcoming = (await getUpcomingBroadcasts(db, 30)).map((b) => ({
		...b,
		onair:
			b.date === now.date &&
			b.start_minutes <= now.minutes &&
			now.minutes < b.start_minutes + b.duration_minutes
	}));

	return {
		upcoming,
		cycleWeek: cycleWeekOf(todayStr()),
		today: todayStr()
	};
};
