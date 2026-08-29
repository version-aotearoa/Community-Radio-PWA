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
		closeMenu();
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
				<span class="brand-mark" aria-hidden="true">
					<svg viewBox="0 0 80 70" width="27" height="24" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z"
						/>
					</svg>
				</span>
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
					<span class="account-name mono" title={user.email}>{user.name || 'You'}</span>
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
					<InstallPrompt variant="menu" label="Install web app" onclose={closeMenu} />
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

		<InstallPrompt variant="banner" />

		<main class="site-main">
			{@render children()}
		</main>

		<footer class="site-footer">
			<span class="brand-mark" aria-hidden="true">
				<svg viewBox="0 0 80 70" width="16" height="14" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z"
					/>
				</svg>
			</span>
			<span class="footer-name">Version Radio</span>
			<span class="footer-note mono">Independent radio · Aotearoa · 24/7</span>
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

	.brand-mark {
		display: grid;
		place-items: center;
		color: var(--vr-text);
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
		border: 1px solid var(--vr-line);
		color: var(--vr-text);
		padding: 0.5rem;
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

	.mobile-menu a,
	.mobile-menu button {
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

	.mobile-menu a:hover,
	.mobile-menu button:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	@media (max-width: 720px) {
		.menu-toggle {
			display: block;
		}

		.site-nav,
		.account {
			display: none;
		}

		.signin {
			margin-left: auto;
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
		gap: 1rem;
	}

	.account-name {
		color: var(--vr-muted);
		max-width: 14rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.account-signout {
		background: none;
		border: 1px solid var(--vr-line-muted);
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.45rem 0.9rem;
		cursor: pointer;
	}

	.account-signout:hover {
		background: var(--vr-text);
		border-color: var(--vr-line);
		color: var(--vr-black);
	}

	.site-footer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		border-top: 1px solid var(--vr-line);
		color: var(--vr-muted);
	}

	.footer-name {
		font-family: var(--vr-font-headline);
		font-size: 1rem;
		line-height: 1;
		text-transform: uppercase;
		color: var(--vr-text);
	}

	.footer-note {
		color: var(--vr-faint);
		margin-left: auto;
	}

	@media (max-width: 720px) {
		.site-header {
			padding: 0.75rem 1rem;
		}

		.footer-note {
			display: none;
		}

		.site-footer {
			padding-left: 1rem;
		}
	}
</style>
