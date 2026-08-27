<script lang="ts">
	import { bannerDismissed, dismissBanner, installEvent, iosHintRequested, isIos, isStandalone } from '$lib/pwa';

	let {
		variant,
		onclose,
		label
	}: {
		variant: 'banner' | 'menu';
		onclose?: () => void;
		label?: string;
	} = $props();

	const deferred = $derived($installEvent);
	const installed = $derived(isStandalone());
	const iosHint = $derived(isIos() && !installed && !deferred);
	const hintRequested = $derived($iosHintRequested);
	const dismissed = $derived($bannerDismissed);
	const visible = $derived((deferred || iosHint || hintRequested) && !installed);

	let menuHintShown = $state(false);
	let done = $state(false);

	async function promptInstall() {
		const ev = deferred;
		if (ev) {
			await ev.prompt();
			const choice = await ev.userChoice;
			if (choice.outcome === 'accepted') {
				done = true;
				dismissBanner();
				onclose?.();
			}
			return;
		}
		if (iosHint) {
			// iOS has no programmatic prompt: show inline help (and expose the banner tip).
			menuHintShown = true;
			$iosHintRequested = true;
		}
	}

	function closeBanner() {
		dismissBanner();
	}

	function initDismissed() {
		// The store is hydrated in +layout onMount; nothing extra needed here.
	}
	initDismissed();
</script>

{#if variant === 'banner'}
	{#if visible && !dismissed && !done}
		<div class="install-banner">
			<div class="install-copy">
				<strong>Get the Version Radio app</strong>
				{#if deferred}
					<span>Install to your home screen for one-tap listening.</span>
				{:else}
					<span>On iPhone: tap the Share button, then “Add to Home Screen”.</span>
				{/if}
			</div>
			<button class="install-btn" onclick={promptInstall}>{deferred ? 'Install' : 'How to'}</button>
			<button class="install-close" onclick={closeBanner} aria-label="Dismiss">×</button>
		</div>
	{/if}
{:else}
	{#if visible}
		<button class="menu-install" onclick={promptInstall} title="Install the app">
			{label ?? (deferred ? 'Install app' : 'Add to home')}
		</button>
		{#if menuHintShown}
			<span class="menu-hint">Tap the Share icon, then “Add to Home Screen”.</span>
		{/if}
	{/if}
{/if}

<style>
	.install-banner {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.6rem 1.25rem;
		background: color-mix(in srgb, var(--vr-accent) 14%, var(--vr-surface-raised));
		border-bottom: 1px solid var(--vr-border);
		font-size: 0.9rem;
		position: relative;
		z-index: 15;
	}

	.install-copy {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
		min-width: 0;
		flex: 1;
	}

	.install-copy span {
		color: var(--vr-muted);
	}

	.install-btn {
		border: 1px solid var(--vr-accent);
		background: var(--vr-accent);
		color: #0b0b11;
		border-radius: 999px;
		padding: 0.35rem 0.9rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.install-close {
		background: none;
		border: none;
		color: var(--vr-muted);
		font-size: 1.3rem;
		line-height: 1;
		cursor: pointer;
		padding: 0.2rem 0.5rem;
	}

	.menu-install {
		border: 1px solid var(--vr-border);
		background: var(--vr-surface);
		color: var(--vr-live);
		border-radius: 8px;
		padding: 0.3rem 0.7rem;
		font-size: 0.85rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.menu-install:hover {
		border-color: var(--vr-accent);
	}

	.menu-hint {
		display: block;
		color: var(--vr-muted);
		font-size: 0.8rem;
		padding: 0 0.4rem;
	}
</style>
