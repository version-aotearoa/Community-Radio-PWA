export const AZURACAST_BASE = 'https://stream.version.nz';
export const AZURACAST_STATION_ID = '1';
export const AZURACAST_STATION_SHORTCODE = 'version_radio';

const TRACK_ID_RE = /^[0-9a-f]{24}$/i;
const DOWNLOAD_RE = /\/api\/station\/[\w-]+\/ondemand\/download\/([0-9a-f]{24})\b/i;

/** Pull a 24-hex track id out of a bare id or an on-demand download link. */
export function extractReplayTrackId(input: string): string | null {
	const id = input.trim();
	if (TRACK_ID_RE.test(id)) return id.toLowerCase();
	const m = id.match(DOWNLOAD_RE);
	return m ? m[1].toLowerCase() : null;
}

/** Canonical public play URL for an on-demand recording. */
export function replayPlayUrl(trackId: string): string {
	return `${AZURACAST_BASE}/api/station/${AZURACAST_STATION_ID}/ondemand/download/${trackId}`;
}

/**
 * Canonical proxied art path served through the /media CDN proxy (edge-cached,
 * ~0.05s warm) instead of a direct ~2.4s AzuraCast fetch.
 * `id` is a bare 24-hex track id (optionally already carrying a -timestamp).
 */
export function replayArtUrl(trackId: string): string {
	return `/media/${trackId}.jpg`;
}

/** Art URL from a stored replay URL, or null if it has no valid track id. */
export function replayArtFromUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	const id = extractReplayTrackId(url);
	return id ? replayArtUrl(id) : null;
}

const ART_FILE_RE = /([0-9a-f]{24}(?:-\d+)?)\.(?:jpg|jpeg|png|webp|avif)$/i;

/**
 * Convert a full AzuraCast art URL (e.g. the nowplaying `song.art`) to the
 * proxied /media path. Falls back to the raw URL if no art id can be extracted.
 */
export function proxiedArtFromUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	const m = url.trim().match(ART_FILE_RE);
	return m ? `/media/${m[1]}.jpg` : url;
}
