import { error } from '@sveltejs/kit';
import { getBroadcast, getShowWithDj, getTracklist } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const db = platform!.env.DB;
	const show = await getShowWithDj(db, params.id);
	if (!show) error(404, 'Show not found');
	const broadcast = await getBroadcast(db, params.broadcastId);
	if (!broadcast || broadcast.show_id !== show.id) error(404, 'Broadcast not found');
	const tracks = await getTracklist(db, broadcast.id);

	const user = locals.user ?? null;
	const saved = user
		? Boolean(
				await db
					.prepare('SELECT 1 AS x FROM saved_show WHERE user_id = ? AND show_id = ?')
					.bind(user.id, show.id)
					.first()
			)
		: false;

	return { show, broadcast, tracks, saved };
};
