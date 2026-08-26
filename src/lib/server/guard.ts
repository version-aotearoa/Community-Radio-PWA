import { redirect } from '@sveltejs/kit';

/** Redirects unauthenticated / non-DJ visitors; returns the DJ user. */
export function requireDj(locals: App.Locals, fallback = '/'): App.User {
	const user = locals.user;
	if (!user) redirect(302, `/login?next=${encodeURIComponent(fallback)}`);
	if (user.role !== 'dj' && user.role !== 'admin') redirect(302, '/');
	return user;
}

/** Redirects unauthenticated visitors; returns the user. */
export function requireUser(locals: App.Locals, fallback = '/'): App.User {
	const user = locals.user;
	if (!user) redirect(302, `/login?next=${encodeURIComponent(fallback)}`);
	return user;
}
