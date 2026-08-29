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
	onAir: {
		id: string;
		title: string;
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
