import { getContent } from '$lib/server/content';
import { sanitizeDescription } from '$lib/server/sanitize';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	return {
		providers: {
			github: Boolean(platform?.env.GITHUB_ID && platform?.env.GITHUB_SECRET),
			google: Boolean(platform?.env.GOOGLE_ID && platform?.env.GOOGLE_SECRET)
		},
		siteKey: platform?.env.PUBLIC_TURNSTILE_SITE_KEY ?? '',
		terms: sanitizeDescription(await getContent(platform!.env.DB, 'terms'))
	};
};
