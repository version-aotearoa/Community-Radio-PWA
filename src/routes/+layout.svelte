<script lang="ts">
	import { WillowDark } from '@svar-ui/svelte-core';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import StreamPlayer from '$lib/components/StreamPlayer.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { initBannerDismissed, initPwa, registerServiceWorker } from '$lib/pwa';
	import { authClient } from '$lib/client';
	import '@fontsource/anton/latin.css';
	import '@fontsource/hanken-grotesk/latin-400.css';
	import '@fontsource/hanken-grotesk/latin-600.css';
	import '@fontsource/jetbrains-mono/latin-500.css';
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
	}

	function initials(u: { name?: string | null; email?: string | null }): string {
		const words = u.name?.trim().split(/\s+/).filter(Boolean) ?? [];
		if (words.length > 0) return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
		return (u.email?.[0] ?? '?').toUpperCase();
	}

	onMount(() => {
		initPwa();
		initBannerDismissed();
		registerServiceWorker();
	});
</script>

<svelte:head>
	<title>Version Radio</title>
	<meta name="theme-color" content="#141313" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/icons/icon-192.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<WillowDark fonts={false}>
	<div class="shell">
		<header class="site-header">
			<a class="brand" href="/" aria-label="Version Radio home">
				<img class="brand-logo" src="/version-logo.svg" alt="VERSION" />
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
				{#if user && (user.role === 'dj' || user.role === 'admin')}
					<a href="/studio">Studio</a>
				{/if}
				<InstallPrompt variant="menu" />
			</nav>
			{#if user}
				<div class="account">
					<a class="avatar" href="/account" title={user.email} aria-label="Account: {user.name || user.email}">
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
							<circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8" />
							<path
								d="M5.5 19a6.5 6.5 0 0 1 13 0"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
							/>
						</svg>
						<span class="mono avatar-initials">{initials(user)}</span>
					</a>
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
					<InstallPrompt variant="menu" label="Install web app" onclose={closeMenu} />
					{#if user}
						{#if user.role === 'dj' || user.role === 'admin'}
							<a href="/studio" onclick={closeMenu}>DJ Studio</a>
						{/if}
						<a href="/account" onclick={closeMenu}>My Version</a>
					{:else}
						<a href="/login" onclick={closeMenu}>Sign in > My Version</a>
					{/if}
				</nav>
				<div class="mobile-menu-secondary">
					<button type="button" onclick={closeMenu}>Contact</button>
					<button type="button" onclick={closeMenu}>Terms</button>
					<button type="button" onclick={closeMenu}>About</button>
				</div>
			</div>
		{/if}

		<InstallPrompt variant="banner" />

		<main class="site-main">
			{@render children()}
		</main>

		<footer class="site-footer">
			<img class="footer-logo" src="/version-logo.svg" alt="VERSION" />
			<span class="footer-note mono">Independent radio · Aotearoa · 24/7</span>
			<nav class="footer-links" aria-label="Footer">
				<button type="button">Contact</button>
				<button type="button">Terms</button>
				<button type="button">About</button>
			</nav>
			{#if user}
				<button class="footer-signout" onclick={signOut}>Sign out</button>
			{/if}
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
		padding: 0.75rem 2rem;
		background: var(--vr-surface);
		border-bottom: 1px solid var(--vr-line);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		color: var(--vr-text);
	}

	.brand-logo {
		height: 20px;
		width: auto;
		display: block;
	}

	.site-nav {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-left: auto;
	}

	.site-nav a {
		font-family: var(--vr-font-headline);
		font-size: 1.125rem;
		line-height: 1.2;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		color: var(--vr-faint);
		text-decoration: none;
		padding: 0.2rem 0.1rem;
		border-bottom: 2px solid transparent;
		transition: color 150ms, background-color 150ms;
	}

	.site-nav a:hover {
		color: var(--vr-black);
		background: var(--vr-text);
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
		z-index: 40;
		background: var(--vr-surface);
		border-bottom: 1px solid var(--vr-line);
		padding: 0;
	}

	.mobile-menu nav {
		display: flex;
		flex-direction: column;
	}

	.mobile-menu a {
		color: var(--vr-text);
		text-decoration: none;
		font-family: var(--vr-font-headline);
		font-size: 1.25rem;
		text-transform: uppercase;
		padding: 0.85rem 2rem;
		border: none;
		border-bottom: 1px solid var(--vr-line-muted);
		background: none;
		text-align: left;
		cursor: pointer;
	}

	.mobile-menu a:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.mobile-menu-secondary {
		display: flex;
		gap: 0;
		padding: 0.5rem 2rem;
		border-top: 1px solid var(--vr-line);
		margin-top: 0.4rem;
	}

	.mobile-menu-secondary button {
		border: none;
		background: none;
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vr-muted);
		padding: 0.5rem 1rem 0.5rem 0;
		margin-right: 1rem;
		cursor: pointer;
	}

	.mobile-menu-secondary button:hover {
		color: var(--vr-text);
		text-decoration: underline;
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
		max-width: 100rem;
		margin: 0 auto;
	}

	.signin {
		color: var(--vr-text);
		text-decoration: none;
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		border: 1px solid var(--vr-line);
		padding: 0.45rem 1rem;
		transition: color 150ms, background-color 150ms;
	}

	.signin:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.account {
		display: flex;
		align-items: center;
	}

	.avatar {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--vr-line);
		color: var(--vr-text);
		text-decoration: none;
		padding: 0.4rem 0.65rem;
		transition: color 150ms, background-color 150ms;
	}

	.avatar:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.avatar-initials {
		font-size: 0.78rem;
	}

	.site-footer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		border-top: 1px solid var(--vr-line);
		color: var(--vr-muted);
	}

	.footer-logo {
		height: 18px;
		width: auto;
		display: block;
	}

	.footer-note {
		color: var(--vr-faint);
		margin-left: auto;
	}

	.footer-links {
		display: flex;
		gap: 1rem;
	}

	.footer-links button {
		border: none;
		background: none;
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0;
		cursor: pointer;
	}

	.footer-links button:hover {
		color: var(--vr-text);
		text-decoration: underline;
	}

	.footer-signout {
		background: none;
		border: 1px solid var(--vr-line-muted);
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.35rem 0.7rem;
		cursor: pointer;
		margin-left: 1rem;
	}

	.footer-signout:hover {
		border-color: var(--vr-line);
		color: var(--vr-text);
	}

	@media (max-width: 720px) {
		.site-header {
			padding: 0.75rem 1rem;
		}

		.footer-note,
		.footer-links {
			display: none;
		}

		.site-footer {
			padding-left: 1rem;
		}
	}
</style>
