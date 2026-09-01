<script lang="ts">
	import { WillowDark } from '@svar-ui/svelte-core';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import StreamPlayer from '$lib/components/StreamPlayer.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { initBannerDismissed, initPwa, registerServiceWorker } from '$lib/pwa';
	import { requestCollapsePlayer } from '$lib/stores/player';
	import { authClient } from '$lib/client';
	import '@fontsource/anton/latin.css';
	import '@fontsource/hanken-grotesk/latin-400.css';
	import '@fontsource/hanken-grotesk/latin-600.css';
	import '@fontsource/jetbrains-mono/latin-500.css';
	import '../app.css';

	let { children } = $props();

	const user = $derived(page.data.user);
	let menuOpen = $state(false);

	// Current path for highlighting the active nav link (prefix match so
	// sub-pages keep their parent item highlighted).
	const path = $derived(page.url.pathname);

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

		// Tap/click outside the mobile menu (or the toggle) closes it.
		// Also covers the player bar: its expand chev is outside the menu,
		// so opening the max player closes the menu via this same handler.
		const onDocPointer = (e: PointerEvent) => {
			if (!menuOpen) return;
			const t = e.target as Node | null;
			if (!t) return;
			const el = t instanceof Element ? t : t.parentElement;
			if (el?.closest('.mobile-menu') || el?.closest('.menu-toggle')) return;
			closeMenu();
		};
		document.addEventListener('pointerdown', onDocPointer);

		// Safari serves back/forward pages from bfcache frozen — no onMount, no
		// load re-run — so refresh data on restore or pages show stale content
		// (e.g. an edited show description or DJ name).
		const onPageshow = (e: PageTransitionEvent) => {
			if (e.persisted) void invalidateAll();
		};
		window.addEventListener('pageshow', onPageshow);

		return () => {
			document.removeEventListener('pointerdown', onDocPointer);
			window.removeEventListener('pageshow', onPageshow);
		};
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
			<a class="brand" href="/" aria-label="Version Radio home" onclick={requestCollapsePlayer}>
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
				<a href="/shows" class:active={path.startsWith('/shows')}>Shows</a>
				<a href="/schedule" class:active={path.startsWith('/schedule')}>Schedule</a>
				<a href="/chat" class:active={path.startsWith('/chat')}>Chat</a>
				<a href="/info" class:active={path.startsWith('/info')}>Info</a>
				{#if user && (user.role === 'dj' || user.role === 'admin')}
					<a href="/studio" class:active={path.startsWith('/studio')}>Studio</a>
				{/if}
				<!-- Install prompt disabled for now
				<InstallPrompt variant="menu" />
				-->
			</nav>
			{#if user}
				<div class="account">
					<a class="avatar" href="/account" title={user.email} aria-label="My Version: {user.name || user.email}">
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
					<a href="/info" onclick={closeMenu}>Info</a>
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
					<a href="/info#contact" onclick={closeMenu}>Contact</a>
					<a href="/info#terms" onclick={closeMenu}>Terms</a>
					<a href="/info#about" onclick={closeMenu}>About</a>
					<a
						class="social"
						href="https://bsky.app/profile/versionhifi.bsky.social"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Bluesky"
						title="Bluesky"
						onclick={closeMenu}
					>
						<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>
					</a>
					<a
						class="social"
						href="https://github.com/version-aotearoa/Community-Radio-PWA"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="GitHub"
						title="GitHub"
						onclick={closeMenu}
					>
						<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
					</a>
				</div>
				<!-- Install banner hidden for now
				<div class="menu-install">
					<InstallPrompt variant="banner" dismissable={false} />
				</div>
				-->
			</div>
		{/if}

		<main class="site-main">
			{@render children()}
		</main>

		<footer class="site-footer">
			<img class="footer-logo" src="/version-logo.svg" alt="VERSION" />
			<span class="footer-note mono">Version Radio · Aotearoa</span>
			<nav class="footer-links" aria-label="Footer">
				<a href="/info#contact">Contact</a>
				<a href="/info#terms">Terms</a>
				<a href="/info#about">About</a>
				<a
					class="social"
					href="https://bsky.app/profile/versionhifi.bsky.social"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Bluesky"
					title="Bluesky"
				>
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>
				</a>
				<a
					class="social"
					href="https://github.com/version-aotearoa/Community-Radio-PWA"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="GitHub"
					title="GitHub"
				>
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
				</a>
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
		gap: 0.5rem;
		margin-left: auto;
	}

	.site-nav a {
		font-family: var(--vr-font-headline);
		font-size: 1.125rem;
		line-height: 1.2;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		color: var(--vr-text);
		text-decoration: none;
		padding: 0.5rem 1.25rem;
		border-bottom: 2px solid transparent;
		transition: color 150ms, background-color 150ms;
	}

	.site-nav a:hover,
	.site-nav a.active {
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

	.mobile-menu-secondary a {
		border: none;
		background: none;
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vr-muted);
		text-decoration: none;
		padding: 0.5rem 1rem 0.5rem 0;
		margin-right: 1rem;
	}

	.mobile-menu-secondary a:hover {
		color: var(--vr-text);
		text-decoration: underline;
		background: none;
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

	.footer-links a {
		border: none;
		background: none;
		color: var(--vr-muted);
		text-decoration: none;
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0;
	}

	.footer-links a:hover {
		color: var(--vr-text);
		text-decoration: underline;
	}

	.social svg {
		width: 15px;
		height: 15px;
		display: block;
	}

	.footer-links a.social {
		display: inline-flex;
		align-items: center;
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
