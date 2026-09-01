<script lang="ts">
	import { Button, Field, Text, TextArea } from '@svar-ui/svelte-core';
	import { invalidateAll } from '$app/navigation';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();

	const isAdmin = $derived(data.user?.role === 'admin');

	const FALLBACK_ABOUT =
		'Version Radio is an underground independent art-radio station from Aotearoa New Zealand — a 24/7 stream of live shows, DJ tracklists, replays, and community chat.';
	const FALLBACK_TERMS =
		'Terms of use are being drafted. Be decent in the chat — abusive behaviour may get you removed. Placeholder copy, to be finalised soon.';

	const aboutBody = $derived(data.about || FALLBACK_ABOUT);
	const termsBody = $derived(data.terms || FALLBACK_TERMS);

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let sending = $state(false);
	let sent = $state(false);
	let error = $state('');
	let turnstileToken = $state('');
	let turnstileExpired = $state(false);

	let editingKey = $state<'about' | 'terms' | null>(null);
	let draft = $state('');
	let contentSaving = $state(false);
	let contentError = $state('');
	let contentSaved = $state('');

	async function startEdit(key: 'about' | 'terms') {
		editingKey = key;
		draft = key === 'about' ? aboutBody : termsBody;
		contentError = '';
		contentSaved = '';
	}

	async function saveContent() {
		if (!editingKey) return;
		contentSaving = true;
		contentError = '';
		contentSaved = '';
		const res = await fetch(`/api/admin/content/${editingKey}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ body: draft })
		});
		contentSaving = false;
		if (!res.ok) {
			const body = (await res.json().catch(() => null)) as { error?: string } | null;
			contentError = body?.error ?? 'Could not save.';
			return;
		}
		const saved = (await res.json()) as { body: string };
		// Re-run the server load so `data.about`/`data.terms` become fresh props
		// (directly mutating `data.*` does not trigger reactivity in Svelte 5).
		await invalidateAll();
		contentSaved = editingKey === 'about' ? 'About saved.' : 'Terms saved.';
		editingKey = null;
		setTimeout(() => (contentSaved = ''), 4000);
	}

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

<Seo title="Info — Version Radio" />

<div class="page">
	<header class="head">
		<h1 class="h-lg">Info</h1>
		<p class="subtitle mono">Station information, contact, and terms.</p>
	</header>

	<section class="card" id="about">
		<div class="card-head">
			<h2 class="card-title">About</h2>
			{#if isAdmin && editingKey !== 'about'}
				<button class="edit-mini" onclick={() => startEdit('about')}>Edit</button>
			{/if}
		</div>
		{#if editingKey === 'about'}
			<RichTextEditor bind:value={draft} placeholder="About the station…" />
			{#if contentError}
				<p class="notice bad">{contentError}</p>
			{/if}
			<div class="edit-actions">
				<Button css="vr-cta" type="primary" disabled={contentSaving} onclick={saveContent}>
					{contentSaving ? 'Saving…' : 'Save'}
				</Button>
				<Button css="vr-cta ghost" onclick={() => (editingKey = null)}>Cancel</Button>
			</div>
		{:else}
			{#if contentSaved === 'About saved.'}
				<p class="notice ok">About saved.</p>
			{/if}
			<p>{@html aboutBody}</p>
		{/if}
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
		<div class="card-head">
			<h2 class="card-title">Terms</h2>
			{#if isAdmin && editingKey !== 'terms'}
				<button class="edit-mini" onclick={() => startEdit('terms')}>Edit</button>
			{/if}
		</div>
		{#if editingKey === 'terms'}
			<RichTextEditor bind:value={draft} placeholder="Terms of use…" />
			{#if contentError}
				<p class="notice bad">{contentError}</p>
			{/if}
			<div class="edit-actions">
				<Button css="vr-cta" type="primary" disabled={contentSaving} onclick={saveContent}>
					{contentSaving ? 'Saving…' : 'Save'}
				</Button>
				<Button css="vr-cta ghost" onclick={() => (editingKey = null)}>Cancel</Button>
			</div>
		{:else}
			{#if contentSaved === 'Terms saved.'}
				<p class="notice ok">Terms saved.</p>
			{/if}
			<p>{@html termsBody}</p>
		{/if}
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
		margin: 0;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 0.6rem;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin: 0 0 1rem;
	}

	.edit-mini {
		border: 1px solid var(--vr-line);
		background: transparent;
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.3rem 0.6rem;
		cursor: pointer;
	}

	.edit-mini:hover {
		background: var(--vr-text);
		color: var(--vr-black);
		border-color: var(--vr-line);
	}

	.card p {
		margin: 0;
		color: var(--vr-muted);
		line-height: 1.55;
	}

	.card p :global(a) {
		color: var(--vr-green);
		text-decoration: underline;
	}

	.card p :global(ul),
	.card p :global(ol) {
		margin: 0 0 0.5rem;
		padding-left: 1.25rem;
	}

	.card p :global(h1),
	.card p :global(h2),
	.card p :global(h3),
	.card p :global(h4) {
		color: var(--vr-text);
		font-size: 1.05rem;
		margin: 0.75rem 0 0.4rem;
	}

	.card p :global(code) {
		font-family: var(--vr-font-mono);
		background: var(--vr-surface-high);
		padding: 0.1rem 0.3rem;
	}

	.edit-actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.75rem;
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

	.notice.ok {
		color: var(--vr-green);
		margin-bottom: 0.75rem;
	}
</style>
