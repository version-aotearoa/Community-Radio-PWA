import { json } from '@sveltejs/kit';
import { bandcampArtUrl, isBandcampPageUrl, resolveBandcampTrack } from '$lib/bandcamp';
import { getTrack, setTrackStream } from '$lib/server/shows';
import type { RequestHandler } from './$types';

/** Re-resolve this many seconds before expiry to avoid handing out a stale URL. */
const EXPIRY_MARGIN = 120;

export const GET: RequestHandler = async ({ params, platform }) => {
	try {
		const db = platform!.env.DB;
		const track = await getTrack(db, params.id);
		if (!track) return json({ error: 'Not found' }, { status: 404 });

		const nowSec = Math.floor(Date.now() / 1000);
		if (
			track.stream_url &&
			track.stream_expires_at &&
			track.stream_expires_at > nowSec + EXPIRY_MARGIN
		) {
			return json({
				streamUrl: track.stream_url,
				title: track.title || null,
				artist: track.artist || null,
				art: bandcampArtUrl(track.stream_art_id),
				durationSeconds: track.duration_seconds,
				capped: Boolean(track.stream_capped)
			});
		}

		if (!track.url) {
			return json({ error: 'This track has no Bandcamp link.' }, { status: 400 });
		}
		if (!isBandcampPageUrl(track.url)) {
			return json(
				{ error: 'Re-link this track with its Bandcamp page URL to play it.' },
				{ status: 422 }
			);
		}

		const resolved = await resolveBandcampTrack(track.url, platform!.env.JINA_API_KEY);
		if (!resolved) {
			return json({ error: "Couldn't start playback for this track." }, { status: 502 });
		}

		await setTrackStream(db, track.id, resolved);

		return json({
			streamUrl: resolved.streamUrl,
			title: resolved.title ?? (track.title || null),
			artist: resolved.artist ?? (track.artist || null),
			art: bandcampArtUrl(resolved.artId),
			durationSeconds: resolved.durationSeconds ?? track.duration_seconds,
			capped: resolved.capped
		});
	} catch {
		return json({ error: "Couldn't start playback for this track." }, { status: 500 });
	}
};
