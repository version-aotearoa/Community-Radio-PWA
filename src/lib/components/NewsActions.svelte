<script lang="ts">
	import { BSKY_URL } from '$lib/site';

	let {
		postId,
		title,
		count = 0,
		active = false,
		compact = false
	}: {
		postId: string;
		title: string;
		count?: number;
		active?: boolean;
		compact?: boolean;
	} = $props();

	let heartCount = $state(0);
	let heartActive = $state(false);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	// Adopt the server-rendered heart state when the props arrive/change.
	$effect(() => {
		heartCount = count;
		heartActive = active;
	});

	// Clear a pending "Copied" flash when the component unmounts.
	$effect(() => {
		return () => {
			if (copyTimer) clearTimeout(copyTimer);
		};
	});

	async function toggleHeart() {
		const prevActive = heartActive;
		const prevCount = heartCount;
		heartActive = !prevActive;
		heartCount = heartActive ? heartCount + 1 : Math.max(0, heartCount - 1);
		const res = await fetch(`/api/news/${postId}/heart`, { method: 'POST' });
		if (!res.ok) {
			heartActive = prevActive;
			heartCount = prevCount;
			return;
		}
		const body = (await res.json().catch(() => null)) as { hearted?: boolean; count?: number } | null;
		if (body) {
			heartActive = body.hearted ?? heartActive;
			heartCount = body.count ?? heartCount;
		}
	}

	async function share() {
		const url = location.href;
		const shareTitle = `${title} — Version Radio`;
		if (navigator.share) {
			try {
				await navigator.share({ title: shareTitle, url });
			} catch {
				// cancelled — no-op
			}
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			return;
		}
		copied = true;
		if (copyTimer) clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 1600);
	}
</script>

<div class="na" class:compact>
	{#if copied}
		<span class="na-note mono">Copied</span>
	{/if}
	<div class="na-row">
		<button
			class="na-btn heart"
			class:active={heartActive}
			onclick={toggleHeart}
			aria-pressed={heartActive}
			title={heartActive ? 'Remove heart' : 'Heart this'}
			aria-label={heartActive ? 'Remove heart' : 'Heart this'}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
					fill={heartActive ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			{#if heartCount > 0}
				<span class="na-count">{heartCount}</span>
			{/if}
		</button>

		<button class="na-btn" onclick={share} title="Share" aria-label="Share">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M12 3v12M8 7l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		<a
			class="na-btn"
			href={BSKY_URL}
			target="_blank"
			rel="noopener noreferrer"
			title="Version Radio on Bluesky"
			aria-label="Version Radio on Bluesky"
		>
			<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>
		</a>
	</div>
</div>

<style>
	.na-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.na-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		min-width: 40px;
		height: 40px;
		padding: 0 0.65rem;
		border: 1px solid var(--vr-line-muted);
		background: transparent;
		color: var(--vr-muted);
		cursor: pointer;
		text-decoration: none;
		transition: color 150ms, border-color 150ms, background-color 150ms;
	}

	.na-btn svg {
		width: 17px;
		height: 17px;
		display: block;
		flex-shrink: 0;
	}

	.na-btn:hover {
		border-color: var(--vr-line);
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.na-btn.active,
	.na-btn.heart:hover,
	.na-btn.heart.active {
		color: var(--vr-red);
		background: none;
	}

	.na-count {
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.na-note {
		display: inline-block;
		color: var(--vr-green);
		font-size: 0.72rem;
		margin-bottom: 0.3rem;
	}

	/* Compact variant for card/row layouts. */
	.compact .na-btn {
		min-width: 30px;
		height: 30px;
		padding: 0 0.45rem;
	}

	.compact .na-btn svg {
		width: 14px;
		height: 14px;
	}

	.compact .na-count {
		font-size: 0.68rem;
	}
</style>
