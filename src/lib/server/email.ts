/**
 * Send a transactional email. Uses the Cloudflare Email Service binding when a
 * sending address is configured; otherwise logs the message (dev fallback so
 * magic-link flows work without a sending domain).
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
	console.log(`[dev-email] To: ${to} | ${mail.subject}\n${mail.text}`);
}
