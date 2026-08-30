<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { Text, TextArea, Field, Button } from '@svar-ui/svelte-core';
	import ShowActions from '$lib/components/ShowActions.svelte';
	import { playback, playMedia, requestTogglePlay, streamPlaying } from '$lib/stores/player';
	import { replayArtFromUrl } from '$lib/azuracast';

	let { data } = $props();

	const show = $derived(data.show);
	const upcoming = $derived(data.upcoming);
	const past = $derived(data.past);

	let title = $state(untrack(() => data.show.title));
	let description = $state(untrack(() => data.show.description ?? ''));
	let djName = $state(untrack(() => data.show.dj_name));
	let djId = $state(untrack(() => data.show.dj_id));
	let djHandle = $state(untrack(() => data.show.dj_handle ?? ''));

	let editing = $state(false);
	let saving = $state(false);
	let editError = $state('');
	let editSaved = $state(false);

	const isAdmin = $derived(data.user?.role === 'admin');

	interface DjOption {
		id: string;
		name: string;
		email: string;
	}

	let djOptions = $state<DjOption[]>([]);

	async function startEdit() {
		editing = true;
		saving = false;
		editError = '';
		editSaved = false;
		title = data.show.title;
		description = data.show.description ?? '';
		djId = data.show.dj_id;
		djHandle = data.show.dj_handle ?? '';
		if (isAdmin && djOptions.length === 0) {
			const res = await fetch('/api/admin/users');
			if (res.ok) {
				const users = (await res.json()) as {
					id: string;
					name: string;
					email: string;
					role: string;
				}[];
				djOptions = users.filter((u) => u.role === 'dj' || u.role === 'admin');
			}
		}
	}

	async function saveEdit() {
		saving = true;
		editError = '';
		editSaved = false;
		const body: Record<string, string> = { title, description, djHandle };
		if (isAdmin) body.djId = djId;
		const res = await fetch(`/api/shows/${data.show.id}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		saving = false;
		if (!res.ok) {
			const err = (await res.json().catch(() => null)) as { error?: string } | null;
			editError = err?.error ?? `Save failed (${res.status})`;
			return;
		}
		await invalidateAll();
		title = data.show.title;
		description = data.show.description ?? '';
		djName = data.show.dj_name;
		djId = data.show.dj_id;
		djHandle = data.show.dj_handle ?? '';
		editing = false;
		editSaved = true;
		setTimeout(() => (editSaved = false), 4000);
	}

	const backHref = $derived(
		page.url.searchParams.get('from') === 'schedule' ? '/schedule' : '/shows'
	);
	const backLabel = $derived(backHref === '/schedule' ? 'Schedule' : 'Shows');

	const eventDate = $derived(
		show.kind === 'event' ? (upcoming[0]?.date ?? past[0]?.date ?? null) : null
	);

	const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function fmtDuration(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		if (h === 0) return `${m} min`;
		return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
	}

	function fmtDate(dateStr: string) {
		return new Intl.DateTimeFormat('en-NZ', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${dateStr}T00:00:00Z`));
	}

	function cycleWeeksLabel(): string {
		const weeks = data.showCycleWeeks;
		if (weeks.length === 1) return `week ${weeks[0]}`;
		return `weeks ${weeks.join(' & ')}`;
	}

	function toggleReplay(b: { id: string; replay_url: string | null; date: string }) {
		if (!b.replay_url) return;
		if (replayActive(b.replay_url)) {
			requestTogglePlay();
			return;
		}
		playMedia({
			url: b.replay_url,
			title: `${show.title} — ${fmtDate(b.date)}`,
			artist: show.kind === 'event' ? null : (show.dj_name ?? null),
			art: replayArtFromUrl(b.replay_url),
			show: { id: show.id, title: show.title },
			href: `/shows/${show.id}/broadcasts/${b.id}`,
			broadcastId: b.id
		});
	}

	function replayActive(url: string | null): boolean {
		if (!url) return false;
		const current = $playback;
		return current.kind === 'media' && current.url === url && $streamPlaying;
	}
</script>

<svelte:head>
	<title>{title} — Version Radio</title>
</svelte:head>

<div class="page">
	<header class="head">
		<div>
			<p class="mono back"><a href={backHref}>← {backLabel}</a></p>
			<h1 class="h-lg">{title}</h1>
			{#if show.kind === 'event'}
				{#if eventDate}
					<p class="subtitle mono">{fmtDate(eventDate)}</p>
				{/if}
			{:else}
				<p class="subtitle mono">
					{DAY_NAMES[show.day_of_week]}s · {fmtTime(show.start_minutes)}–{fmtTime(
						show.start_minutes + show.duration_minutes
					)}{#if show.interval_weeks === 1} · Every week{/if}
				</p>
				{#if data.showCycleWeeks.length > 0}
					<p class="cycle-line mono">
						Show airs {cycleWeeksLabel()} of 4 — current cycle week {data.currentCycleWeek}
					</p>
				{/if}
			{/if}
			{#if djName && show.kind !== 'event'}
				<p class="dj mono">with {djName}</p>
			{/if}
			{#if editing}
				<form class="edit-form" onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
					<Field label="Title">
						<Text bind:value={title} css="vr-input" />
					</Field>
					<Field label="DJ name">
						<Text
							bind:value={djHandle}
							css="vr-input"
							placeholder={data.show.dj_name ?? 'e.g. LLUSH'}
						/>
					</Field>
					{#if isAdmin}
						<Field label="DJ">
							<select class="dj-select" bind:value={djId}>
								{#if !djOptions.some((d) => d.id === djId)}
									<option value={djId} disabled>Unknown DJ</option>
								{/if}
								{#each djOptions as dj (dj.id)}
									<option value={dj.id}>{dj.name || dj.email}</option>
								{/each}
							</select>
						</Field>
					{/if}
					<Field label="Description">
						<TextArea bind:value={description} css="vr-input" />
					</Field>
					{#if editError}
						<div class="notice bad">{editError}</div>
					{/if}
					<div class="edit-actions">
						<Button css="vr-cta" type="primary" disabled={saving} onclick={saveEdit}>
							{saving ? 'Saving…' : 'Save'}
						</Button>
						<Button css="vr-cta ghost" onclick={() => (editing = false)}>Cancel</Button>
					</div>
				</form>
			{:else}
				{#if description}
					<p class="desc">{description}</p>
				{/if}
				{#if editSaved}
					<div class="notice ok">Saved</div>
				{/if}
			{/if}
		</div>
		<div class="head-actions">
			<ShowActions
				showId={show.id}
				showTitle={title}
				followed={data.followed}
				user={data.user}
			/>
			{#if data.canEdit}
				<button class="btn-outline" onclick={startEdit} disabled={editing}>Edit show</button>
			{/if}
		</div>
	</header>

	{#if upcoming.length > 0}
		<section class="block">
			<h2 class="h-md">Upcoming</h2>
			<ul class="broadcasts">
				{#each upcoming as b (b.id)}
					<li class="broadcast" class:today={b.date === data.today}>
						<header>
							<strong>{fmtDate(b.date)}</strong>
							<span class="mono">
								{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}
							</span>
						{#if data.canEdit}
							<a
								class="edit-mini"
								href={`/shows/${show.id}/broadcasts/${b.id}/tracklist`}
								aria-label="Edit tracklist"
								title="Edit tracklist"
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path
										d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										stroke-linejoin="round"
									/>
								</svg>
							</a>
						{/if}
					</header>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if past.length > 0}
		<section class="block">
			<h2 class="h-md">Past broadcasts</h2>
			<ul class="broadcasts">
				{#each past as b, i (b.id)}
					<li class="broadcast past">
						<a
							class="past-art"
							href={`/shows/${show.id}/broadcasts/${b.id}`}
							aria-label={`View ${fmtDate(b.date)} episode`}
						>
							{#if replayArtFromUrl(b.replay_url)}
								<img src={replayArtFromUrl(b.replay_url) ?? ''} alt="" loading="lazy" />
							{:else}
								<span class="past-art-fallback" aria-hidden="true">
									<svg viewBox="0 0 80 70" fill="currentColor" width="36" height="31">
										<path
											fill-rule="evenodd"
											d="M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z"
										/>
									</svg>
								</span>
							{/if}
						</a>
						<div class="past-body">
							<header>
								<strong>{fmtDate(b.date)}</strong>
								{#if data.canEdit}
									<a
										class="edit-mini"
										href={`/shows/${show.id}/broadcasts/${b.id}/tracklist`}
										aria-label="Edit tracklist"
										title="Edit tracklist"
									>
										<svg viewBox="0 0 24 24" aria-hidden="true">
											<path
												d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"
												fill="none"
												stroke="currentColor"
												stroke-width="1.8"
												stroke-linejoin="round"
											/>
										</svg>
									</a>
								{/if}
							</header>
							<div class="replay">
								{#if b.replay_url}
									<button class="replay-btn" class:playing={replayActive(b.replay_url)} onclick={() => toggleReplay(b)}>
										{#if replayActive(b.replay_url)}
											<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
											Pause
										{:else}
											<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
											Replay
										{/if}
									</button>
								{/if}
								<a class="view-show mono" href={`/shows/${show.id}/broadcasts/${b.id}`}>View →</a>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if upcoming.length === 0 && past.length === 0}
		<p class="hint mono">No scheduled broadcasts yet.</p>
	{/if}
</div>

<style>
	.page {
		padding: 2rem;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.75rem;
	}

	.head-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
		flex-shrink: 0;
	}

	.back {
		margin: 0 0 0.5rem;
	}

	.back a {
		color: var(--vr-muted);
		text-decoration: none;
	}

	.back a:hover {
		color: var(--vr-text);
		text-decoration: underline;
	}

	.head h1 {
		margin: 0;
	}

	.subtitle {
		margin: 0.75rem 0 0;
		color: var(--vr-muted);
		font-variant-numeric: tabular-nums;
	}

	.dj {
		margin: 0.4rem 0 0;
		color: var(--vr-faint);
	}

	.cycle-line {
		margin: 0.4rem 0 0;
		color: var(--vr-faint);
	}

	.desc {
		margin: 0.85rem 0 0;
		color: var(--vr-muted);
		max-width: 44rem;
	}

	.edit-form {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 28rem;
	}

	.dj-select {
		background: var(--vr-surface-low);
		color: var(--vr-text);
		border: 1px solid var(--vr-line);
		padding: 0.4rem 0.5rem;
		width: 100%;
	}

	.edit-actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.25rem;
	}

	.notice {
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--vr-line);
		font-size: 0.85rem;
	}

	.notice.ok {
		color: var(--vr-green);
	}

	.notice.bad {
		color: var(--vr-red);
	}

	.block {
		margin-top: 1.5rem;
	}

	.block h2 {
		margin: 0 0 0.75rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 0.5rem;
	}

	.broadcast {
		border: 1px solid var(--vr-line-muted);
		background: var(--vr-surface-low);
		padding: 1rem 1.25rem 1.1rem;
	}

	.broadcasts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.broadcast.today {
		border-color: var(--vr-line);
		background: var(--vr-surface-high);
	}

	.broadcast header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}

	.broadcast header strong {
		font-family: var(--vr-font-body);
		font-weight: 600;
	}

	.broadcast header span {
		color: var(--vr-green);
		font-variant-numeric: tabular-nums;
	}

	.broadcast:not(.today) header span {
		color: var(--vr-muted);
	}

	.edit-mini {
		margin-left: auto;
		color: var(--vr-muted);
		border: 1px solid var(--vr-line-muted);
		padding: 0.3rem 0.5rem;
		text-decoration: none;
		white-space: nowrap;
		display: inline-grid;
		place-items: center;
	}

	.edit-mini svg {
		width: 12px;
		height: 12px;
		display: block;
	}

	.edit-mini:hover {
		background: var(--vr-text);
		color: var(--vr-black);
		border-color: var(--vr-line);
	}

	.hint {
		color: var(--vr-muted);
		font-size: 0.9rem;
		margin: 0;
	}

	.replay {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.85rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--vr-line-muted);
	}

	.broadcast.past {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		align-items: stretch;
		padding: 0;
		overflow: hidden;
	}

	.broadcast.past .past-art {
		display: block;
		width: auto;
		height: 100%;
		aspect-ratio: 1 / 1;
		background: var(--vr-surface-highest);
	}

	.broadcast.past .past-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.past-art-fallback {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		background: #000;
		color: var(--vr-text);
	}

	.broadcast.past .past-body {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 0.9rem 1.1rem 0.9rem 0;
		min-width: 0;
	}

	@media (max-width: 640px) {
		.broadcast.past {
			gap: 0.75rem;
		}
	}

	.replay-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--vr-line);
		background: transparent;
		color: var(--vr-text);
		padding: 0.4rem 0.9rem;
		font-size: 0.75rem;
		font-family: var(--vr-font-mono);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.replay-btn svg {
		width: 13px;
		height: 13px;
		display: block;
		margin-top: 1px;
		flex-shrink: 0;
	}

	.replay-btn:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.replay-btn.playing {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.view-show {
		color: var(--vr-green);
		font-size: 0.8rem;
		text-decoration: none;
		margin-left: auto;
		white-space: nowrap;
	}

	.view-show:hover {
		text-decoration: underline;
	}
</style>
