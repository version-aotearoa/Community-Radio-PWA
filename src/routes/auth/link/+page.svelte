<script lang="ts">
	import { Button } from '@svar-ui/svelte-core';
	import { onMount } from 'svelte';
	import Seo from '$lib/components/Seo.svelte';

	let href = $state('');
	let missing = $state(false);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const token = params.get('token');
		if (!token) {
			missing = true;
			return;
		}
		// Build the one-time verify URL only after this page is open, so email
		// prefetchers never touch /api/auth/magic-link/verify (which consumes the
		// token on its first GET).
		const verify = new URL(window.location.origin);
		verify.pathname = '/api/auth/magic-link/verify';
		verify.searchParams.set('token', token);
		verify.searchParams.set('callbackURL', params.get('callbackURL') || '/');
		href = verify.toString();
	});

	function signIn() {
		if (href) window.location.assign(href);
	}
</script>

<svelte:head>
	<title>Confirm sign in — Version Radio</title>
</svelte:head>

<Seo />

<div class="wrap">
	<section class="card">
		<h1>Confirm sign in</h1>
		{#if missing}
			<p class="muted">
				This sign-in link is invalid or has already been used. Links work once and expire after 10
				minutes.
			</p>
			<p><a href="/login">Get a new sign-in link</a></p>
		{:else if !href}
			<p class="muted">Checking your sign-in link…</p>
		{:else}
			<p class="muted">
				You're about to sign in to Version Radio. Continue to finish signing in — this link works once.
			</p>
			<Button css="vr-cta" type="primary" onclick={signIn}>Sign in to Version Radio</Button>
		{/if}
	</section>
</div>

<style>
	.wrap {
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

	a {
		color: var(--vr-text);
	}
</style>
