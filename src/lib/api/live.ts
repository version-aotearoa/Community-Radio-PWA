export interface LivePayload {
	isOnline: boolean;
	live: {
		isLive: boolean;
		streamerName: string | null;
	};
	nowPlaying: {
		title: string | null;
		artist: string | null;
		text: string | null;
		art: string | null;
		playedAt: number | null;
		duration: number | null;
		elapsed: number | null;
		remaining: number | null;
	} | null;
	trackShow: { id: string; title: string } | null;
	/** Show matched from our schedule/roster while a DJ is live (streamer name). */
	liveShow: {
		id: string;
		title: string;
		djName: string | null;
		djImage: string | null;
		image: string | null;
	} | null;
	onAir: {
		id: string;
		title: string;
		image: string | null;
		djName: string | null;
		djImage: string | null;
		date: string;
		startMinutes: number;
		durationMinutes: number;
	} | null;
	next: {
		id: string;
		title: string;
		djName: string | null;
		djImage: string | null;
		date: string;
		startMinutes: number;
	} | null;
	now: { date: string; minutes: number };
}

/**
 * Artwork for whatever is airing. While a DJ is live, prefer our own show
 * identity (curated show image, then DJ avatar) because the encoder's
 * now-playing art goes stale; otherwise prefer the track art and fall back to
 * the show/DJ image.
 */
export function liveArtOf(payload: LivePayload | null, isLive: boolean): string {
	const show =
		payload?.onAir?.image ??
		payload?.liveShow?.image ??
		payload?.onAir?.djImage ??
		payload?.liveShow?.djImage ??
		null;
	const track = payload?.nowPlaying?.art ?? null;
	return (isLive ? (show ?? track) : (track ?? show)) ?? '';
}

export async function fetchLive(): Promise<LivePayload | null> {
	try {
		const res = await fetch('/api/live', { headers: { accept: 'application/json' } });
		if (!res.ok) return null;
		return (await res.json()) as LivePayload;
	} catch (e) {
		console.warn(`[vr] /api/live fetch failed on ${location.origin}:`, e);
		return null;
	}
}
