/**
 * Resolve a Bandcamp track page into a playable stream URL + metadata.
 *
 * Bandcamp is behind Cloudflare Bot Management: datacenter egress (our Worker,
 * or a VPS) gets a JS "Client Challenge". The Jina reader renders the page from
 * its own infrastructure and returns the real HTML, so we fetch through it and
 * read the server-rendered `data-tralbum` JSON.
 *
 * `file` holds signed `t4.bcbits.com` stream URLs that expire in ~24h (the `ts`
 * param), so callers cache until then and re-resolve after.
 */

const HOST_RE = /(^|\.)bandcamp\.com$/i;
const JINA_BASE = 'https://r.jina.ai/';
const TRALBUM_RE = /data-tralbum="([^"]*)"/;
/** Best quality first. */
const STREAM_FORMATS = ['mp3-v0', 'mp3-128', 'aac-hi', 'aac-lo'];

export interface BandcampStream {
	streamUrl: string;
	/** Unix seconds when the signed URL expires (from its `ts` param). */
	expiresAt: number | null;
	format: string;
	title: string | null;
	artist: string | null;
	artId: string | null;
	durationSeconds: number | null;
	capped: boolean;
}

export function isBandcampUrl(url: string): boolean {
	try {
		return HOST_RE.test(new URL(url).hostname);
	} catch {
		return false;
	}
}

/** Artwork URL for a Bandcamp art id (square thumbnail). */
export function bandcampArtUrl(artId: string | null | undefined): string | null {
	return artId ? `https://f4.bcbits.com/img/a${artId}_10.jpg` : null;
}

function decodeEntities(s: string): string {
	return s
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#0?39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&gt;/g, '>')
		.replace(/&lt;/g, '<');
}

interface Tralbum {
	art_id?: number | null;
	artist?: string | null;
	play_cap_data?: unknown;
	trackinfo?: Array<{
		title?: string | null;
		artist?: string | null;
		duration?: number | null;
		art_id?: number | null;
		is_capped?: boolean;
		file?: Record<string, string> | null;
	}> | null;
}

export async function resolveBandcampTrack(
	url: string,
	apiKey?: string
): Promise<BandcampStream | null> {
	if (!isBandcampUrl(url)) return null;

	let html: string;
	try {
		const res = await fetch(JINA_BASE + url, {
			headers: {
				'x-respond-with': 'html',
				...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
			},
			signal: AbortSignal.timeout(20000)
		});
		if (!res.ok) return null;
		html = await res.text();
	} catch {
		return null;
	}

	const raw = html.match(TRALBUM_RE)?.[1];
	if (!raw) return null;
	let data: Tralbum;
	try {
		data = JSON.parse(decodeEntities(raw)) as Tralbum;
	} catch {
		return null;
	}

	const track = data.trackinfo?.[0];
	const file = track?.file;
	if (!track || !file) return null;

	const keys = Object.keys(file).filter((k) => typeof file[k] === 'string' && file[k]);
	const format = STREAM_FORMATS.find((f) => keys.includes(f)) ?? keys[0];
	if (!format) return null;
	const streamUrl = file[format];

	let expiresAt: number | null = null;
	try {
		const ts = Number(new URL(streamUrl).searchParams.get('ts'));
		if (Number.isFinite(ts) && ts > 0) expiresAt = ts;
	} catch {
		// no ts param
	}

	const artId =
		track.art_id != null ? String(track.art_id) : data.art_id != null ? String(data.art_id) : null;

	return {
		streamUrl,
		expiresAt,
		format,
		title: track.title ?? null,
		artist: track.artist ?? data.artist ?? null,
		artId,
		durationSeconds: typeof track.duration === 'number' ? track.duration : null,
		capped: track.is_capped === true || Boolean(data.play_cap_data)
	};
}
