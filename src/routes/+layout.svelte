<script lang="ts">
	import { WillowDark } from '@svar-ui/svelte-core';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import StreamPlayer from '$lib/components/StreamPlayer.svelte';
	import { authClient } from '$lib/client';
	import '../app.css';

	let { children } = $props();

	const user = $derived(page.data.user);

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Version Radio</title>
	<meta name="theme-color" content="#0b0b11" />
</svelte:head>

<WillowDark fonts={false}>
	<div class="shell">
		<header class="site-header">
			<a class="brand" href="/" aria-label="Version Radio home">
				<span class="brand-mark" aria-hidden="true">
					<svg viewBox="0 0 32 32" width="24" height="24">
						<path
							d="M4 18v-4M10 22V10M16 26V6M22 20v-8M28 16v0"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
						/>
					</svg>
				</span>
				<span class="brand-name">Version Radio</span>
			</a>
			<nav class="site-nav" aria-label="Primary">
				<a href="/">Listen</a>
				<a href="/schedule">Schedule</a>
				<a href="/chat">Chat</a>
			</nav>
			{#if user}
				<div class="account">
					{#if user.role === 'dj' || user.role === 'admin'}
						<a class="dj-link" href="/studio">DJ Studio</a>
					{/if}
					<span class="account-name" title={user.email}>{user.name || 'You'}</span>
					<button class="account-signout" onclick={signOut}>Sign out</button>
				</div>
			{:else}
				<a class="signin" href="/login">Sign in</a>
			{/if}
		</header>

		<main class="site-main">
			{@render children()}
		</main>

		<footer class="site-footer">
			<span>Version Radio</span>
		</footer>

		<StreamPlayer />
	</div>
</WillowDark>

<style>
	.shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--vr-bg);
		color: var(--vr-text);
		padding-bottom: 64px;
	}

	.site-header {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.75rem 1.25rem;
		background: color-mix(in srgb, var(--vr-bg) 82%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--vr-border);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--vr-text);
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--vr-accent);
		color: #0b0b11;
	}

	.brand-name {
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	.site-nav {
		display: flex;
		gap: 0.25rem;
		margin-left: auto;
	}

	.site-nav a {
		color: var(--vr-muted);
		text-decoration: none;
		font-size: 0.95rem;
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
	}

	.site-nav a:hover {
		color: var(--vr-text);
		background: var(--vr-surface);
	}

	.site-main {
		flex: 1;
		width: 100%;
		max-width: 72rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 4rem;
	}

	.account {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.account-name {
		color: var(--vr-text);
		font-size: 0.9rem;
	}

	.account-signout,
	.dj-link,
	.signin {
		color: var(--vr-accent-strong);
		text-decoration: none;
		font-size: 0.9rem;
	}

	.account-signout {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font: inherit;
	}

	.dj-link {
		color: var(--vr-live);
		border: 1px solid var(--vr-border);
		border-radius: 8px;
		padding: 0.3rem 0.7rem;
	}

	.account-signout:hover,
	.dj-link:hover,
	.signin:hover {
		text-decoration: underline;
	}

	.site-footer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--vr-border);
		color: var(--vr-muted);
		font-size: 0.85rem;
	}
</style>
