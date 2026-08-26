<script lang="ts">
	import { Button, Field, Text } from '@svar-ui/svelte-core';
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/client';
	import Turnstile from '$lib/components/Turnstile.svelte';

	let { data } = $props();

	let email = $state('');
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
		error = '';
		if (!email.trim()) {
			error = 'Enter your email address first.';
			return;
		}
		if (data.siteKey) {
			if (!turnstileToken) {
				error = turnstileExpired ? 'Verification expired — please verify again.' : 'Please complete the verification.';
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
				return;
			}
		}
		busy = true;
		const res = await authClient.signIn.magicLink({ email, callbackURL: '/' });
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

<div class="login-wrap">
	<section class="card">
		{#if user}
			<h1>Signed in</h1>
			<p class="muted">
				You're signed in as <strong>{user.name || user.email}</strong>.
			</p>
			<Button css="vr-ghost" type="primary" onclick={signOut}>Sign out</Button>
		{:else}
			<h1>Sign in to Version Radio</h1>
			<p class="muted">Get a magic link by email, or use one of your accounts.</p>

			{#if sent}
				<div class="notice ok">Check your inbox — we've emailed you a sign-in link.</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); sendMagicLink(); }}>
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
					<Button css="vr-cta" type="primary" disabled={busy} onclick={sendMagicLink}>
						{busy ? 'Sending…' : 'Email me a sign-in link'}
					</Button>
				</form>

				{#if github || google}
					<div class="divider"><span>or continue with</span></div>
					<div class="socials">
						{#if github}
							<Button css="vr-ghost" onclick={() => signInWith('github')}>GitHub</Button>
						{/if}
						{#if google}
							<Button css="vr-ghost" onclick={() => signInWith('google')}>Google</Button>
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
	}

	.card {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		padding: 1.75rem 2rem;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
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
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--vr-border);
	}

	.socials {
		display: flex;
		gap: 0.75rem;
	}

	.notice {
		margin: 0.5rem 0 1rem;
		padding: 0.6rem 0.85rem;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.notice.ok {
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.4);
		color: #6ee7b7;
	}

	.notice.bad {
		background: rgba(255, 77, 109, 0.12);
		border: 1px solid rgba(255, 77, 109, 0.4);
		color: #ffb3c1;
	}
</style>
