<script lang="ts">
	import { Button, Field, Text } from '@svar-ui/svelte-core';
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/client';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();

	let email = $state('');
	let displayName = $state('');
	let sent = $state(false);
	let error = $state('');
	let busy = $state(false);
	let turnstileToken = $state('');
	let turnstileExpired = $state(false);

	const user = $derived(data.user);
	const { github, google } = $derived(data.providers);

	function onTurnstileToken(token: string) {
		turnstileToken = token;
		turnstileExpired = false;
	}

	function onTurnstileExpire() {
		turnstileToken = '';
		turnstileExpired = true;
	}

	async function sendMagicLink() {
		// Lock synchronously before the async Turnstile check: the svar-ui
		// Button renders type="submit", so a click also submits the form — a
		// second send would fire unless busy is already set (→ 2 magic links).
		if (busy) return;
		busy = true;
		error = '';
		if (!email.trim()) {
			error = 'Enter your email address first.';
			busy = false;
			return;
		}
		if (data.siteKey) {
			if (!turnstileToken) {
				error = turnstileExpired ? 'Verification expired — please verify again.' : 'Please complete the verification.';
				busy = false;
				return;
			}
			const vr = await fetch('/api/verify-turnstile', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: turnstileToken })
			});
			if (!vr.ok) {
				error = 'Verification failed. Please try again.';
				turnstileToken = '';
				busy = false;
				return;
			}
		}
		const name = displayName.trim().slice(0, 50);
		const res = await authClient.signIn.magicLink({
			email,
			callbackURL: '/',
			...(name ? { name } : {})
		});
		busy = false;
		if (res.error) {
			error = res.error.message ?? 'Something went wrong. Please try again.';
			return;
		}
		sent = true;
	}

	async function signInWith(provider: 'github' | 'google') {
		error = '';
		await authClient.signIn.social({ provider, callbackURL: '/' });
	}

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Sign in — Version Radio</title>
</svelte:head>

<Seo />

<div class="login-wrap">
	<section class="card">
		{#if user}
			<h1>Signed in</h1>
			<p class="muted">
				You're signed in as <strong>{user.name || user.email}</strong>.
			</p>
			<Button css="vr-cta ghost" type="primary" onclick={signOut}>Sign out</Button>
		{:else}
			<h1>Sign in to Version Radio</h1>
			<p class="muted">Get a magic link by email, or use one of your accounts.</p>

			{#if sent}
				<div class="notice ok">Check your inbox — we've emailed you a sign-in link.</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); sendMagicLink(); }}>
					<Field label="Display name (optional)">
						<Text
							type="text"
							placeholder="Used when creating your account"
							bind:value={displayName}
							css="vr-input"
						/>
					</Field>
					<Field label="Email">
						<Text
							type="text"
							placeholder="you@example.com"
							bind:value={email}
							css="vr-input"
						/>
					</Field>
					{#if data.siteKey}
						<Turnstile
							siteKey={data.siteKey}
							action="login"
							onToken={onTurnstileToken}
							onExpire={onTurnstileExpire}
						/>
					{/if}
					{#if error}
						<div class="notice bad">{error}</div>
					{/if}
					<Button
						css="vr-cta"
						type="primary"
						disabled={busy}
						onclick={(e) => {
							e.preventDefault();
							sendMagicLink();
						}}
					>
						{busy ? 'Sending…' : 'Email me a sign-in link'}
					</Button>
				</form>

				{#if github || google}
					<div class="divider"><span>or continue with</span></div>
					<div class="socials">
						{#if github}
							<Button css="vr-cta ghost" onclick={() => signInWith('github')}>GitHub</Button>
						{/if}
						{#if google}
							<Button css="vr-cta ghost" onclick={() => signInWith('google')}>Google</Button>
						{/if}
					</div>
				{/if}
			{/if}
		{/if}
	</section>
</div>

<style>
	.login-wrap {
		max-width: 26rem;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	.card {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
		padding: 1.75rem 2rem;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-family: var(--vr-font-headline);
		font-size: 1.9rem;
		font-weight: 400;
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0.01em;
	}

	.muted {
		color: var(--vr-muted);
		margin: 0 0 1.25rem;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 1.25rem 0;
		color: var(--vr-muted);
		font-size: 0.85rem;
		font-family: var(--vr-font-mono);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--vr-line-muted);
	}

	.socials {
		display: flex;
		gap: 0.75rem;
	}

	.notice {
		margin: 0.5rem 0 1rem;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--vr-line);
		font-size: 0.9rem;
	}

	.notice.ok {
		color: var(--vr-muted);
	}

	.notice.bad {
		color: var(--vr-text);
	}
</style>
