import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	return { siteKey: platform!.env.PUBLIC_TURNSTILE_SITE_KEY ?? null };
};
