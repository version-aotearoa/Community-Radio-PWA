/**
 * Resolve a Bandcamp track URL into its numeric embed id by reading the
 * track page's `twitter:player` / `og:video:url` meta tags.
 * Returns null for anything that isn't a resolvable Bandcamp track page.
 */

const HOST_RE = /(^|\.)bandcamp\.com$/i;
const TRACK_ID_RE = /EmbeddedPlayer\/(?:v=\d+\/)?track=(\d+)/;
const PLAYER_DATA_RE = /data-player-data="([^"]*)"/;

export interface BandcampInfo {
	embedId: string;
	albumId: string | null;
}

export function isBandcampUrl(url: string): boolean {
	try {
		const host = new URL(url).hostname;
		return HOST_RE.test(host);
	} catch {
		return false;
	}
}

export async function resolveBandcamp(url: string, fetchImpl: typeof fetch = fetch): Promise<BandcampInfo | null> {
	if (!isBandcampUrl(url)) return null;
	try {
		const res = await fetchImpl(url, {
			headers: {
				'user-agent':
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
			},
			signal: AbortSignal.timeout(8000)
		});
		if (!res.ok) return null;
		const html = await res.text();
		const m = html.match(TRACK_ID_RE);
		if (!m) return null;

		// Canonical track/album ids live in the page's `data-player-data` JSON
		// (attribute-safe: &quot; entities). Read album_id from there.
		let albumId: string | null = null;
		const raw = html.match(PLAYER_DATA_RE)?.[1];
		if (raw) {
			try {
				const data = JSON.parse(
					raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
				) as { album_id?: number | null };
				if (typeof data.album_id === 'number') albumId = String(data.album_id);
			} catch {
				albumId = null;
			}
		}
		return { embedId: m[1], albumId };
	} catch {
		return null;
	}
}
