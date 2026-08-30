import { error } from '@sveltejs/kit';
import { requireDj } from '$lib/server/guard';
import { getBroadcast, getShow, getTracklist } from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const user = requireDj(locals, `/shows/${params.id}`);
	const show = await getShow(platform!.env.DB, params.id);
	if (!show) error(404, 'Show not found');
	if (show.dj_id !== user.id && user.role !== 'admin') {
		error(403, 'You do not have permission to edit this show');
	}

	const broadcast = await getBroadcast(platform!.env.DB, params.broadcastId);
	if (!broadcast || broadcast.show_id !== show.id) {
		error(404, 'Broadcast not found');
	}

	const tracks = await getTracklist(platform!.env.DB, broadcast.id);
	return { show, broadcast, tracks };
};
