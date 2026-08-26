import { error } from '@sveltejs/kit';
import {
	ensureBroadcasts,
	getBroadcastTracksMap,
	getBroadcasts,
	getShowWithDj,
	todayStr
} from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const db = platform!.env.DB;
	const show = await getShowWithDj(db, params.id);
	if (!show) error(404, 'Show not found');

	await ensureBroadcasts(db, show);
	const broadcasts = await getBroadcasts(db, show.id);
	const tracks = await getBroadcastTracksMap(db, broadcasts.map((b) => b.id));

	const user = locals.user ?? null;
	const canEdit =
		user !== null && (user.role === 'admin' || (user.role === 'dj' && show.dj_id === user.id));

	const today = todayStr();
	return {
		show,
		broadcasts,
		tracks,
		canEdit,
		today,
		upcoming: broadcasts.filter((b) => b.date >= today),
		past: broadcasts.filter((b) => b.date < today).reverse()
	};
};
