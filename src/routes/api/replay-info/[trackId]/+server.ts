import { json } from '@sveltejs/kit';
import { extractReplayTrackId, replayPlayUrl } from '$lib/azuracast';
import type { RequestHandler } from './$types';

/**
 * Duration estimate for live-streamed archives that expose no media-element
 * duration: HEAD probe for Content-Length + one timed byte slice to measure
 * effective bitrate. Memoised per track id (worker isolate).
 */
const cache = new Map<string, { bytes: number; kbps: number; durationEst: number; at: number }>();
const TTL = 60 * 60 * 1000;

/** ID3v2 "TLEN" frame: audio length in milliseconds stored as ASCII digits. */
function id3TlenSeconds(buf: Uint8Array): number {
	if (buf.length < 10 || buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return 0;
	const tagSize = (buf[6] << 21) | (buf[7] << 13) | (buf[8] << 5) | buf[9];
	const end = Math.min(buf.length, 10 + tagSize);
	let pos = 10;
	while (pos + 10 <= end) {
		const id = String.fromCharCode(buf[pos], buf[pos + 1], buf[pos + 2], buf[pos + 3]);
		const size = (buf[pos + 4] << 24) | (buf[pos + 5] << 16) | (buf[pos + 6] << 8) | buf[pos + 7];
		if (id === 'TLEN') {
			let digits = '';
			const frameEnd = Math.min(pos + 10 + size, buf.length);
			for (let i = pos + 10; i < frameEnd; i++) {
				const c = buf[i];
				if (c >= 0x30 && c <= 0x39) digits += String.fromCharCode(c);
				else if (digits.length > 0) break;
			}
			const ms = Number(digits);
			return digits.length > 0 && ms > 0 ? Math.round(ms / 1000) : 0;
		}
		if (size <= 0 || pos + 10 + size > end) break;
		pos += 10 + size;
	}
	return 0;
}

export const GET: RequestHandler = async ({ params }) => {
	const id = extractReplayTrackId(params.trackId);
	if (!id) return json({ error: 'bad-id' }, { status: 400 });

	const hit = cache.get(id);
	if (hit && Date.now() - hit.at < TTL) return json(hit);

		try {
			const head = await fetch(replayPlayUrl(id), { method: 'HEAD' });
			const bytes = Number(head.headers.get('content-length')) || 0;

			// Exact duration comes from the m4a container's mvhd atom
			// (faststart -> moov/mvhd near the start of the file).
			let durationEst = 0;
			try {
				const pre = await fetch(replayPlayUrl(id), {
					headers: { range: 'bytes=0-1048575' }
				});
				const buf = new Uint8Array(await pre.arrayBuffer());
				// locate 'mvhd' (box payload starts after the 8-byte box header)
				let hi = -1;
				for (let i = 0; i + 4 <= buf.length; i++) {
					if (buf[i] === 0x6d && buf[i + 1] === 0x76 && buf[i + 2] === 0x68 && buf[i + 3] === 0x64) {
						hi = i;
						break;
					}
				}
				const idxReal = hi;
				if (idxReal > 0 && idxReal + 36 <= buf.length) {
					const v = buf[idxReal + 4];
					let timescale = 0;
					let dur = 0;
					if (v === 0) {
						timescale = (buf[idxReal + 16] << 24) | (buf[idxReal + 17] << 16) | (buf[idxReal + 18] << 8) | buf[idxReal + 19];
						dur = (buf[idxReal + 20] << 24) | (buf[idxReal + 21] << 16) | (buf[idxReal + 22] << 8) | buf[idxReal + 23];
					} else {
						timescale = (buf[idxReal + 24] << 24) | (buf[idxReal + 25] << 16) | (buf[idxReal + 26] << 8) | buf[idxReal + 27];
						const d = new DataView(buf.buffer, buf.byteOffset + idxReal + 28, 8);
						dur = Number(d.getBigUint64(0) as bigint);
					}
					if (timescale > 0 && dur > 0) durationEst = Math.round(dur / timescale);
				}
			} catch {
				// mvhd unavailable -> fall through to estimate
			}

			// MP3 (ID3v2) files carry a TLEN frame: length in milliseconds.
			if (!durationEst) {
				let tlen = 0;
				try {
					const pre = await fetch(replayPlayUrl(id), {
						headers: { range: 'bytes=0-1048575' }
					});
					tlen = id3TlenSeconds(new Uint8Array(await pre.arrayBuffer()));
				} catch {
					// tlen unavailable -> fall through
				}
				if (tlen > 0) durationEst = tlen;
			}

			// Fallback: measured slice throughput is download speed, NOT the
			// audio bitrate, so only use it as a rough bound and never as the
			// primary duration.
			if (!durationEst) {
				const t0 = performance.now();
				const slice = await fetch(replayPlayUrl(id), {
					headers: { range: 'bytes=0-262143' }
				});
				const buf = await slice.arrayBuffer();
				const ms = Math.max(1, performance.now() - t0);
				const kbps = Math.max(8, Math.round(((buf.byteLength * 8) / (ms / 1000)) / 1000));
				durationEst = Math.round((bytes * 8) / (kbps * 1000));
			}
			const kbps = Math.round((bytes * 8) / Math.max(1, durationEst) / 1000);
			const out = { bytes, kbps, durationEst };
			cache.set(id, { ...out, at: Date.now() });
			return json(out);
		} catch {
			return json({ bytes: 0, kbps: 0, durationEst: 0 });
		}
	};
