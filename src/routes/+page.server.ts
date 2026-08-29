import { getUpcomingBroadcasts, todayStr, zonedNow } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export interface LatestShow {
	broadcast_id: string;
	show_id: string;
	date: string;
	start_minutes: number;
	replay_url: string | null;
	title: string;
	show_image: string | null;
	dj_name: string | null;
}

export interface FeaturedShow {
	broadcast_id: string;
	show_id: string;
	date: string;
	replay_url: string | null;
	title: string;
	image: string | null;
	dj_name: string | null;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform!.env.DB;
	const today = todayStr();

	const { results } = await db
		.prepare(
			`SELECT b.id AS broadcast_id, b.show_id, b.date, b.start_minutes, b.replay_url, s.title, s.image AS show_image, COALESCE(NULLIF(s.dj_handle, ''), u.name) AS dj_name
			 FROM broadcast b
			 JOIN show s ON s.id = b.show_id
			 LEFT JOIN user u ON u.id = s.dj_id
			 WHERE b.date < ? AND s.active = 1 AND b.id = (
				SELECT b2.id FROM broadcast b2
				WHERE b2.show_id = b.show_id AND b2.date < ?
				ORDER BY b2.date DESC, b2.start_minutes DESC LIMIT 1
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

	// Featured: curated archive episodes, most recent first. Falls back to the
	// three earliest-dated broadcasts if any curated row is missing.
	const FEATURED_IDS = [
		'prev-reasonable-dubs',
		'version-excursions-26-8-5-2026-08-05',
		'prev-version-excursions-26-8-5'
	];

	const featuredSelect = (extra: string) => `
		SELECT b.id AS broadcast_id, b.date, b.show_id, b.replay_url, s.title, s.image AS show_image, COALESCE(NULLIF(s.dj_handle, ''), u.name) AS dj_name
		FROM broadcast b
		JOIN show s ON s.id = b.show_id
		LEFT JOIN user u ON u.id = s.dj_id
		${extra}`;

	type FeaturedRow = {
		broadcast_id: string;
		date: string;
		show_id: string;
		replay_url: string | null;
		title: string;
		show_image: string | null;
		dj_name: string | null;
	};

	const curated = (
		await db
			.prepare(featuredSelect(`WHERE b.id IN (${FEATURED_IDS.map(() => '?').join(',')}) ORDER BY b.date DESC`))
			.bind(...FEATURED_IDS)
			.all()
	).results as unknown as FeaturedRow[];
	let rows = curated;
	if (rows.length < 3) {
		const fallback = await db
			.prepare(featuredSelect('WHERE s.active = 1 ORDER BY b.date ASC, b.start_minutes ASC LIMIT 3'))
			.all();
		rows = fallback.results as unknown as FeaturedRow[];
	}
	const featured = rows.map((r) => ({
		broadcast_id: r.broadcast_id,
		show_id: r.show_id,
		date: r.date,
		replay_url: r.replay_url,
		title: r.title,
		image: r.show_image,
		dj_name: r.dj_name
	}));

	return {
		latest: results as unknown as LatestShow[],
		upcoming,
		featured
	};
};
