import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ platform }) => {
	return {
		chatUrl: platform?.env.PUBLIC_CHAT_URL ?? '',
		siteKey: platform?.env.PUBLIC_TURNSTILE_SITE_KEY ?? ''
	};
};
