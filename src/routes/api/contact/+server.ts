import { json } from '@sveltejs/kit';
import { sendEmail } from '$lib/server/email';
import { verifyTurnstile } from '$lib/server/turnstile';
import type { RequestHandler } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	const env = platform!.env;
	const body = (await request.json()) as {
		name?: unknown;
		email?: unknown;
		message?: unknown;
		turnstileToken?: unknown;
	};

	const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
	const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
	const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';

	if (!email || !EMAIL_RE.test(email)) {
		return json({ error: 'Enter a valid email address.' }, { status: 400 });
	}
	if (!message) return json({ error: 'Enter a message.' }, { status: 400 });

	if (env.PUBLIC_TURNSTILE_SITE_KEY) {
		const ok = await verifyTurnstile(
			env,
			typeof body.turnstileToken === 'string' ? body.turnstileToken : '',
			'contact',
			getClientAddress()
		);
		if (!ok) return json({ error: 'Verification failed. Please try again.' }, { status: 403 });
	}

	const to = env.CONTACT_TO || env.EMAIL_FROM || 'admin@version.nz';
	const text = `Name: ${name || '—'}\nEmail: ${email}\n\n${message}`;
	await sendEmail(env, to, {
		subject: `Contact form — ${name || email}`,
		text,
		html: `<p><strong>From:</strong> ${name || '—'} &lt;${email}&gt;</p><p>${message.replace(/\n/g, '<br>')}</p>`
	});

	return json({ ok: true });
};
