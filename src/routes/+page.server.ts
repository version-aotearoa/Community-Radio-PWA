import { getUpcomingBroadcasts, todayStr, zonedNow } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export interface LatestShow {
	show_id: string;
	date: string;
	start_minutes: number;
	replay_url: string | null;
	title: string;
	show_image: string | null;
	dj_name: string | null;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform!.env.DB;
	const today = todayStr();

	const { results } = await db
		.prepare(
			`SELECT b.show_id, b.date, b.start_minutes, b.replay_url, s.title, s.image AS show_image, u.name AS dj_name
			 FROM broadcast b
			 JOIN show s ON s.id = b.show_id
			 LEFT JOIN user u ON u.id = s.dj_id
			 WHERE b.date < ? AND s.active = 1 AND b.id IN (
				SELECT MAX(b2.id) FROM broadcast b2 WHERE b2.show_id = b.show_id AND b2.date < ?
			 )
			 ORDER BY b.date DESC, b.start_minutes DESC
			 LIMIT 3`
		)
		.bind(today, today)
		.all();

	const now = zonedNow();
	const upcoming = (await getUpcomingBroadcasts(db, 7)).slice(0, 6).map((b) => ({
		...b,
		onair:
			b.date === now.date &&
			b.start_minutes <= now.minutes &&
			now.minutes < b.start_minutes + b.duration_minutes
	}));

	return {
		latest: results as unknown as LatestShow[],
		upcoming
	};
};
