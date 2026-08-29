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
