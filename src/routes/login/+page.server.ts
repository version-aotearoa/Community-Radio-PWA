import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ platform }) => {
	return {
		providers: {
			github: Boolean(platform?.env.GITHUB_ID && platform?.env.GITHUB_SECRET),
			google: Boolean(platform?.env.GOOGLE_ID && platform?.env.GOOGLE_SECRET)
		},
		siteKey: platform?.env.PUBLIC_TURNSTILE_SITE_KEY ?? ''
	};
};
