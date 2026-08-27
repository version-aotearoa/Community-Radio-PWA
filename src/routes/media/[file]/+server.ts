import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const UPSTREAM_BASE = 'https://stream.version.nz/api/station/version_radio/art';
const FILE_RE = /^[a-z0-9]{24}(?:-\d+)?\.(?:jpg|jpeg|png|webp|avif)$/i;

/**
 * Edge-cached art proxy: /media/<art-file>.jpg
 * Fetches the AzuraCast artwork once, then serves it through Cloudflare's CDN
 * with a year-long immutable cache so card images are instant for everyone.
 */
export const GET: RequestHandler = async ({ params, fetch: cfFetch }) => {
	const file = params.file;
	if (!file || !FILE_RE.test(file)) error(404, 'Not found');

	const upstream = await cfFetch(`${UPSTREAM_BASE}/${file}`);
	if (!upstream.ok) error(404, 'Not found');

	return new Response(upstream.body, {
		headers: {
			'cache-control': 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
			'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
			etag: `"${file}"`,
			'x-content-type-options': 'nosniff'
		}
	});
};
