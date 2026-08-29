<script lang="ts">
	import { untrack, onDestroy } from 'svelte';

	let {
		showId,
		showTitle,
		saved: initialSaved,
		user
	}: {
		showId: string;
		showTitle: string;
		saved: boolean;
		user: { role?: string; name?: string; email?: string } | null;
	} = $props();

	let saved = $state(untrack(() => initialSaved));
	let loginHint = $state(false);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	async function toggleSaved() {
		if (!user) {
			loginHint = true;
			return;
		}
		loginHint = false;
		const prev = saved;
		saved = !saved;
		const res = await fetch(`/api/shows/${showId}/saved`, { method: 'POST' });
		if (res.status === 401) {
			saved = prev;
			loginHint = true;
			return;
		}
		if (!res.ok) saved = prev;
	}

	async function share() {
		const url = location.href;
		const title = `${showTitle} — Version Radio`;
		if (navigator.share) {
			try {
				await navigator.share({ title, url });
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

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
	});
</script>

<div class="actions">
	{#if copied}
		<span class="copy-note mono">Copied</span>
	{/if}
	{#if loginHint}
		<div class="login-hint">
			Sign in to save shows — <a class="hint-link" href="/login">Sign in</a>
		</div>
	{/if}
	<div class="icon-row">
		<button
			class="sq-btn"
			class:active={saved}
			onclick={toggleSaved}
			aria-pressed={saved}
			aria-label={saved ? 'Remove bookmark' : 'Bookmark show'}
			title={saved ? 'Remove bookmark' : 'Bookmark show'}
		>
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				<path
					d="M6 4.5v15l6-4.5 6 4.5v-15a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"
					fill={saved ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<button class="sq-btn" onclick={share} aria-label="Share show" title="Share show">
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
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
	</div>
</div>

<style>
	.actions {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
		flex-shrink: 0;
	}

	.icon-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sq-btn {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 1px solid var(--vr-line-muted);
		background: transparent;
		color: var(--vr-muted);
		cursor: pointer;
		padding: 0;
		transition: color 150ms, border-color 150ms;
	}

	.sq-btn:hover {
		border-color: var(--vr-line);
		color: var(--vr-text);
	}

	.sq-btn.active {
		border-color: var(--vr-line);
		color: var(--vr-text);
	}

	.sq-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--vr-bg), 0 0 0 3px var(--vr-line);
	}

	.login-hint {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface-low);
		color: var(--vr-muted);
		padding: 0.5rem 0.7rem;
		font-size: 0.85rem;
	}

	.hint-link {
		color: var(--vr-text);
		text-decoration: underline;
		font-weight: 600;
	}

	.copy-note {
		color: var(--vr-green);
		font-size: 0.8rem;
	}
</style>
