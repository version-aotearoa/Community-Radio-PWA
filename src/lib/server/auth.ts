import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { sendEmail } from './email';

/**
 * Create a Better Auth instance for a request. The instance is cheap to build
 * and needs the per-request Cloudflare bindings (D1 + env vars).
 */
export function createAuth(env: CloudflareBindings) {
	const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
	if (env.GITHUB_ID && env.GITHUB_SECRET) {
		socialProviders.github = { clientId: env.GITHUB_ID, clientSecret: env.GITHUB_SECRET };
	}
	if (env.GOOGLE_ID && env.GOOGLE_SECRET) {
		socialProviders.google = { clientId: env.GOOGLE_ID, clientSecret: env.GOOGLE_SECRET };
	}

	return betterAuth({
		database: env.DB,
		secret: env.AUTH_SECRET,
		user: {
			additionalFields: {
				role: {
					type: 'string',
					required: false,
					defaultValue: 'listener',
					input: false
				},
				active: {
					type: 'boolean',
					required: false,
					defaultValue: true,
					input: false
				}
			}
		},
		socialProviders,
		plugins: [
			magicLink({
				expiresIn: 600,
				sendMagicLink: async ({ email, url }) => {
					// Deactivated accounts are not allowed to sign in.
					const row = await env.DB.prepare('SELECT active FROM user WHERE email = ?')
						.bind(email)
						.first<{ active: number }>();
					if (row && row.active === 0) {
						console.log(`[auth] blocked magic link for deactivated account: ${email}`);
						return;
					}
					// Email clients and security scanners prefetch hrefs in email. The
					// better-auth verify URL is one-time (token consumed on first GET),
					// so point the email at a /auth/link confirm page instead — only an
					// explicit click there fires the actual one-time verify request.
					const verifyUrl = url;
					const landing = new URL(url);
					landing.pathname = '/auth/link';
					console.log(`[auth] magic link email sent to ${email} (${landing.origin})`);
					await sendEmail(env, email, {
						subject: 'Your sign-in link for Version Radio',
						text: `Sign in to Version Radio with this link (valid for 10 minutes, single use):\n\n${landing}\n\nIf the link above doesn't open a confirmation page, paste this into your browser:\n${verifyUrl}`,
						html: `<p>Sign in to <strong>Version Radio</strong> by opening the link below. The link is valid for 10 minutes and can only be used once.</p><p style="margin:24px 0"><a href="${landing}" style="background:#eceaf6;color:#0b0b11;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Sign in to Version Radio</a></p><p style="color:#666">If the button doesn't open a confirmation page, copy and paste this URL into your browser: ${verifyUrl}</p>`
					});
				}
			})
		]
	});
}
