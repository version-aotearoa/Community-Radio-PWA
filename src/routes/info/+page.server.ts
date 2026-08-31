import { getContent } from '$lib/server/content';
import { sanitizeDescription } from '$lib/server/sanitize';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform!.env.DB;
	return {
		siteKey: platform!.env.PUBLIC_TURNSTILE_SITE_KEY ?? null,
		about: sanitizeDescription(await getContent(db, 'about')),
		terms: sanitizeDescription(await getContent(db, 'terms'))
	};
};
