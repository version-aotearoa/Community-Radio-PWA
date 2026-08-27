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
					await sendEmail(env, email, {
						subject: 'Your sign-in link for Version Radio',
						text: `Sign in to Version Radio with this link (valid for 10 minutes):\n\n${url}`,
						html: `<p>Sign in to <strong>Version Radio</strong> by clicking the button below. The link is valid for 10 minutes.</p><p style="margin:24px 0"><a href="${url}" style="background:#7c5cff;color:#0b0b11;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Sign in</a></p><p style="color:#666">Or copy this URL: ${url}</p>`
					});
				}
			})
		]
	});
}
