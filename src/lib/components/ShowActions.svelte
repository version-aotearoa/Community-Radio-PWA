<script lang="ts">
	import { onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let {
		showId,
		showTitle,
		followed: initialFollowed,
		user,
		episode = null,
		episodeSaved: initialEpisodeSaved = false,
		compact = false,
		hintExternal = false,
		onHintChange
	}: {
		showId: string;
		showTitle: string;
		followed: boolean;
		user: { role?: string; name?: string; email?: string } | null;
		episode?: { broadcastId: string } | null;
		episodeSaved?: boolean;
		compact?: boolean;
		hintExternal?: boolean;
		onHintChange?: (hint: { show: boolean; kind: 'follow' | 'save' } | null) => void;
	} = $props();

	let followed = $state(false);
	let episodeSaved = $state(false);
	let loginHint = $state(false);
	let hintKind = $state<'follow' | 'save'>('follow');
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	// Sync from props whenever the server re-fetches fresh state (invalidateAll
	// after a toggle, or navigating back). The optimistic flip in the toggle
	// still lands first; this keeps the display pinned to the persisted source
	// of truth.
	$effect(() => {
		followed = initialFollowed;
		episodeSaved = initialEpisodeSaved;
	});

	$effect(() => {
		if (!hintExternal) return;
		onHintChange?.(loginHint ? { show: true, kind: hintKind } : null);
	});

	async function toggleFollow() {
		if (!user) {
			hintKind = 'follow';
			loginHint = true;
			return;
		}
		loginHint = false;
		const prev = followed;
		followed = !followed;
		const res = await fetch(`/api/shows/${showId}/follow`, { method: 'POST' });
		if (res.status === 401) {
			followed = prev;
			hintKind = 'follow';
			loginHint = true;
			return;
		}
		if (!res.ok) {
			followed = prev;
			await invalidateAll();
			return;
		}
		// Server is the source of truth: adopt the persisted state from the
		// response, then re-validate so any follow-up navigation (e.g. to the
		// account page) loads the fresh persisted state.
		const body = (await res.json().catch(() => null)) as { following?: boolean } | null;
		followed = body?.following ?? !prev;
		await invalidateAll();
	}

	async function toggleEpisodeSaved() {
		if (!episode) return;
		if (!user) {
			hintKind = 'save';
			loginHint = true;
			return;
		}
		loginHint = false;
		const prev = episodeSaved;
		episodeSaved = !episodeSaved;
		const res = await fetch(`/api/shows/${showId}/broadcasts/${episode.broadcastId}/saved`, {
			method: 'POST'
		});
		if (res.status === 401) {
			episodeSaved = prev;
			hintKind = 'save';
			loginHint = true;
			return;
		}
		if (!res.ok) {
			episodeSaved = prev;
			await invalidateAll();
			return;
		}
		const body = (await res.json().catch(() => null)) as { saved?: boolean } | null;
		episodeSaved = body?.saved ?? !prev;
		await invalidateAll();
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

<div class="actions" class:compact>
	{#if copied}
		<span class="copy-note mono">Copied</span>
	{/if}
	{#if !hintExternal && loginHint}
		<div class="login-hint">
			{hintKind === 'follow' ? 'Sign in to follow shows' : 'Sign in to save broadcasts'} — <a class="hint-link" href="/login">Sign in</a>
		</div>
	{/if}
	<div class="icon-row">
		{#if !episode}
			<button
				class="sq-btn"
				class:active={followed}
				onclick={toggleFollow}
				aria-pressed={followed}
				aria-label={followed ? 'Unfollow show' : 'Follow show'}
				title={followed ? 'Unfollow show' : 'Follow show'}
			>
				<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
					<path
						d="M12 3a6 6 0 0 1 6 6v3l1.6 2.6a.6.6 0 0 1-.5.9H4.9a.6.6 0 0 1-.5-.9L6 12V9a6 6 0 0 1 6-6zM10 17.5a2 2 0 0 0 4 0"
						fill={followed ? 'currentColor' : 'none'}
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{/if}
		{#if episode}
			<button
				class="sq-btn"
				class:active={episodeSaved}
				onclick={toggleEpisodeSaved}
				aria-pressed={episodeSaved}
				aria-label={episodeSaved ? 'Remove bookmark' : 'Bookmark broadcast'}
				title={episodeSaved ? 'Remove bookmark' : 'Bookmark broadcast'}
			>
				<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
					<path
						d="M6 4.5v15l6-4.5 6 4.5v-15a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"
						fill={episodeSaved ? 'currentColor' : 'none'}
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{/if}
		<button class="sq-btn" onclick={share} aria-label="Share" title="Share">
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
		min-width: 0;
		max-width: 100%;
	}

	.actions.compact {
		margin-left: auto;
		align-items: flex-end;
		gap: 0.4rem;
	}

	.actions.compact .login-hint,
	.actions.compact .copy-note {
		text-align: right;
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
		max-width: 100%;
		white-space: normal;
	}

	@media (max-width: 640px) {
		.actions.compact .login-hint {
			text-align: left;
		}
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
