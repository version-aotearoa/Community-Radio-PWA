<script lang="ts">
	import { Button, Field, Text, TextArea } from '@svar-ui/svelte-core';
	import Turnstile from '$lib/components/Turnstile.svelte';

	let { data } = $props();

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let sending = $state(false);
	let sent = $state(false);
	let error = $state('');
	let turnstileToken = $state('');
	let turnstileExpired = $state(false);

	function onTurnstileToken(token: string) {
		turnstileToken = token;
		turnstileExpired = false;
	}

	function onTurnstileExpire() {
		turnstileToken = '';
		turnstileExpired = true;
	}

	async function submit() {
		error = '';
		if (!email.trim()) {
			error = 'Enter your email address.';
			return;
		}
		if (!message.trim()) {
			error = 'Enter a message.';
			return;
		}
		if (data.siteKey && !turnstileToken) {
			error = turnstileExpired
				? 'Verification expired — please verify again.'
				: 'Please complete the verification.';
			return;
		}
		sending = true;
		const res = await fetch('/api/contact', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, email, message, turnstileToken })
		});
		sending = false;
		if (!res.ok) {
			const body = (await res.json().catch(() => null)) as { error?: string } | null;
			error = body?.error ?? 'Could not send your message. Please try again.';
			return;
		}
		sent = true;
	}
</script>

<svelte:head>
	<title>Info — Version Radio</title>
</svelte:head>

<div class="page">
	<header class="head">
		<h1 class="h-lg">Info</h1>
		<p class="subtitle mono">Station information, contact, and terms.</p>
	</header>

	<section class="card" id="about">
		<h2 class="card-title">About</h2>
		<p>
			Version Radio is an underground independent art-radio station from Aotearoa New Zealand
			— a 24/7 stream of live shows, DJ tracklists, replays, and community chat.
		</p>
	</section>

	<section class="card" id="contact">
		<h2 class="card-title">Contact</h2>
		{#if sent}
			<p>Thanks — we'll get back to you.</p>
		{:else}
			<form class="contact-form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
				<Field label="Name (optional)">
					<Text bind:value={name} placeholder="Your name" css="vr-input" />
				</Field>
				<Field label="Email">
					<Text bind:value={email} placeholder="you@example.com" css="vr-input" />
				</Field>
				<Field label="Message">
					<TextArea bind:value={message} placeholder="Say hi…" css="vr-input" />
				</Field>
				{#if data.siteKey}
					<Turnstile
						siteKey={data.siteKey}
						action="contact"
						onToken={onTurnstileToken}
						onExpire={onTurnstileExpire}
					/>
				{/if}
				{#if error}
					<div class="notice bad">{error}</div>
				{/if}
				<Button css="vr-cta" type="primary" disabled={sending} onclick={submit}>
					{sending ? 'Sending…' : 'Send message'}
				</Button>
			</form>
		{/if}
	</section>

	<section class="card" id="terms">
		<h2 class="card-title">Terms</h2>
		<p>
			Terms of use are being drafted. Be decent in the chat — abusive behaviour may get you
			removed. Placeholder copy, to be finalised soon.
		</p>
	</section>
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 48rem;
	}

	.head {
		margin: 0 0 1.5rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 1rem;
	}

	.head h1 {
		margin: 0;
	}

	.subtitle {
		margin: 0.5rem 0 0;
		color: var(--vr-muted);
	}

	.card {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
		padding: 1.25rem 1.5rem;
		margin-bottom: 1.5rem;
		scroll-margin-top: 5rem;
	}

	.card-title {
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin: 0 0 1rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 0.6rem;
	}

	.card p {
		margin: 0;
		color: var(--vr-muted);
		line-height: 1.55;
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 28rem;
	}

	.notice {
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--vr-line);
		font-size: 0.85rem;
		color: var(--vr-red);
	}
</style>
