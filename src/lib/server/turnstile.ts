/**
 * Verify a Turnstile token against the Cloudflare siteverify API.
 * Fails closed on any network/validation error.
 */
export async function verifyTurnstile(
	env: CloudflareBindings,
	token: string | null | undefined,
	action: string,
	remoteip?: string | null
): Promise<boolean> {
	if (!token || token.length === 0 || token.length > 2048 || !env.TURNSTILE_SECRET) {
		return false;
	}
	const expectedHostnames = new Set(
		(env.TURNSTILE_HOSTNAMES ?? '')
			.split(',')
			.map((h) => h.trim())
			.filter(Boolean)
	);
	if (expectedHostnames.size === 0) return false;

	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			signal: AbortSignal.timeout(10_000),
			body: new URLSearchParams({
				secret: env.TURNSTILE_SECRET,
				response: token,
				...(remoteip ? { remoteip } : {})
			})
		});
		if (!res.ok) return false;
		const result = (await res.json()) as { success?: boolean; action?: string; hostname?: string };
		if (result.success !== true) return false;
		if (result.action && result.action !== action) return false;
		if (!expectedHostnames.has(result.hostname ?? '')) return false;
		return true;
	} catch {
		return false;
	}
}
