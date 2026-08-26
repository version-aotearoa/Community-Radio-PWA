import { error } from '@sveltejs/kit';
import { requireDj } from '$lib/server/guard';
import {
	ensureBroadcasts,
	getActiveBroadcast,
	getShow,
	getTracklist
} from '$lib/server/shows';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const user = requireDj(locals, `/shows/${params.id}/tracklist`);
	const show = await getShow(platform!.env.DB, params.id);
	if (!show) error(404, 'Show not found');
	if (show.dj_id !== user.id && user.role !== 'admin') {
		error(403, 'You do not have permission to edit this show');
	}

	await ensureBroadcasts(platform!.env.DB, show);
	const broadcast = await getActiveBroadcast(platform!.env.DB, show.id);
	if (!broadcast) error(404, 'No upcoming broadcast for this show');

	const tracks = await getTracklist(platform!.env.DB, broadcast.id);
	return { show, broadcast, tracks, canEdit: true };
};
