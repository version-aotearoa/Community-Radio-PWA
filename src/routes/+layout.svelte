<script lang="ts">
	import { WillowDark } from '@svar-ui/svelte-core';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import StreamPlayer from '$lib/components/StreamPlayer.svelte';
	import { authClient } from '$lib/client';
	import '../app.css';

	let { children } = $props();

	const user = $derived(page.data.user);
	let menuOpen = $state(false);

	function closeMenu() {
		menuOpen = false;
	}

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
		closeMenu();
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
			<button
				class="menu-toggle"
				aria-label="Menu"
				aria-expanded={menuOpen}
				onclick={() => (menuOpen = !menuOpen)}
			>
				{#if menuOpen}
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				{/if}
			</button>
			<nav class="site-nav" aria-label="Primary">
				<a href="/shows">Shows</a>
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

		{#if menuOpen}
			<div class="mobile-menu">
				<nav aria-label="Mobile">
					<a href="/shows" onclick={closeMenu}>Shows</a>
					<a href="/schedule" onclick={closeMenu}>Schedule</a>
					<a href="/chat" onclick={closeMenu}>Chat</a>
					{#if user}
						{#if user.role === 'dj' || user.role === 'admin'}
							<a href="/studio" onclick={closeMenu}>DJ Studio</a>
						{/if}
						<button onclick={signOut}>Sign out</button>
					{:else}
						<a href="/login" onclick={closeMenu}>Sign in</a>
					{/if}
				</nav>
			</div>
		{/if}

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

	.menu-toggle {
		display: none;
		margin-left: auto;
		background: none;
		border: none;
		color: var(--vr-text);
		padding: 0.4rem;
		cursor: pointer;
	}

	.mobile-menu {
		position: fixed;
		top: 57px;
		left: 0;
		right: 0;
		z-index: 25;
		background: var(--vr-surface-raised);
		border-bottom: 1px solid var(--vr-border);
		padding: 0.5rem 1rem 0.75rem;
		box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
	}

	.mobile-menu nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.mobile-menu a,
	.mobile-menu button {
		color: var(--vr-text);
		text-decoration: none;
		font-size: 1rem;
		padding: 0.6rem 0.4rem;
		border-radius: 8px;
		background: none;
		border: none;
		text-align: left;
		font: inherit;
		cursor: pointer;
	}

	.mobile-menu a:hover,
	.mobile-menu button:hover {
		background: var(--vr-surface);
	}

	@media (max-width: 720px) {
		.menu-toggle {
			display: block;
		}

		.site-nav,
		.account,
		.signin {
			display: none;
		}
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
