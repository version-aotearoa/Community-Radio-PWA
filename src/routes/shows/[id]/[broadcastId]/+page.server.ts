import { error } from '@sveltejs/kit';
import { getShowWithDj, getTracklist, resolveBroadcastForShow } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const db = platform!.env.DB;
	const show = await getShowWithDj(db, params.id);
	if (!show) error(404, 'Show not found');
	const broadcast = await resolveBroadcastForShow(db, show.id, params.broadcastId);
	if (!broadcast) error(404, 'Broadcast not found');
	const tracks = await getTracklist(db, broadcast.id);

	const user = locals.user ?? null;
	const canEdit =
		user !== null && (user.role === 'admin' || (user.role === 'dj' && show.dj_id === user.id));
	const followed = user
		? Boolean(
				await db
					.prepare('SELECT 1 AS x FROM follow_show WHERE user_id = ? AND show_id = ?')
					.bind(user.id, show.id)
					.first()
			)
		: false;
	const savedEpisode = user
		? Boolean(
				await db
					.prepare('SELECT 1 AS x FROM saved_episode WHERE user_id = ? AND broadcast_id = ?')
					.bind(user.id, broadcast.id)
					.first()
			)
		: false;

	return { show, broadcast, tracks, followed, savedEpisode, canEdit };
};
