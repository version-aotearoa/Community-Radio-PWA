/**
 * Send a transactional email.
 *
 * Priority:
 *  1. Cloudflare Email Service binding (EMAIL + EMAIL_FROM configured)
 *  2. Resend API (RESEND_API_KEY + RESEND_FROM configured)
 *  3. console.log (dev fallback so magic-link flows work without a sending provider)
 */
export async function sendEmail(
	env: CloudflareBindings,
	to: string,
	mail: { subject: string; text: string; html: string }
): Promise<void> {
	if (env.EMAIL && env.EMAIL_FROM) {
		await env.EMAIL.send({
			to,
			from: { email: env.EMAIL_FROM, name: 'Version Radio' },
			subject: mail.subject,
			html: mail.html,
			text: mail.text
		});
		return;
	}

	if (env.RESEND_API_KEY && env.RESEND_FROM) {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				authorization: `Bearer ${env.RESEND_API_KEY}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				from: env.RESEND_FROM,
				to: [to],
				subject: mail.subject,
				html: mail.html,
				text: mail.text
			})
		});
		if (!res.ok) {
			console.error(`[resend] ${res.status} ${await res.text().catch(() => '')}`);
			throw new Error(`Resend failed with status ${res.status}`);
		}
		return;
	}

	console.log(`[dev-email] To: ${to} | ${mail.subject}\n${mail.text}`);
}
