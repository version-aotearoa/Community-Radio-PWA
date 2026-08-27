import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { createAuth } from '$lib/server/auth';

export async function handle({ event, resolve }) {
	if (event.platform?.env) {
		const auth = createAuth(event.platform.env);

		const session = await auth.api.getSession({ headers: event.request.headers });
		if (session) {
			if (session.user.active === false) {
				// Deactivated user: destroy their session and treat as signed out.
				await auth.api.signOut({ headers: event.request.headers });
				event.locals.session = null;
				event.locals.user = null;
			} else {
				event.locals.session = session.session as App.Session;
				event.locals.user = session.user as App.User;
			}
		}

		return svelteKitHandler({ event, resolve, auth, building });
	}

	return resolve(event);
}
