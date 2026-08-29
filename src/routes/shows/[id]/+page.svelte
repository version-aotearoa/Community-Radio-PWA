<script lang="ts">
	import { page } from '$app/state';
	import ShowActions from '$lib/components/ShowActions.svelte';
	import { playback, playMedia, requestTogglePlay, streamPlaying } from '$lib/stores/player';
	import { replayArtFromUrl } from '$lib/azuracast';

	let { data } = $props();

	const show = $derived(data.show);
	const upcoming = $derived(data.upcoming);
	const past = $derived(data.past);

	const backHref = $derived(
		page.url.searchParams.get('from') === 'schedule' ? '/schedule' : '/shows'
	);
	const backLabel = $derived(backHref === '/schedule' ? 'Schedule' : 'Shows');

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

	function cycleLabel(show: { interval_weeks: number }) {
		if (show.interval_weeks === 1) return 'Every week';
		return `Every ${show.interval_weeks} weeks`;
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
			artist: show.dj_name ?? null,
			art: replayArtFromUrl(b.replay_url),
			show: { id: show.id, title: show.title },
			href: `/shows/${show.id}/broadcasts/${b.id}`
		});
	}

	function replayActive(url: string | null): boolean {
		if (!url) return false;
		const current = $playback;
		return current.kind === 'media' && current.url === url && $streamPlaying;
	}
</script>

<svelte:head>
	<title>{show.title} — Version Radio</title>
</svelte:head>

<div class="page">
	<header class="head">
		<div>
			<p class="mono back"><a href={backHref}>← {backLabel}</a></p>
			<h1 class="h-lg">{show.title}</h1>
			<p class="subtitle mono">
				{DAY_NAMES[show.day_of_week]}s · {fmtTime(show.start_minutes)}–{fmtTime(
					show.start_minutes + show.duration_minutes
				)} · {cycleLabel(show)}
			</p>
			{#if show.dj_name}
				<p class="dj mono">with {show.dj_name}</p>
			{/if}
			{#if show.description}
				<p class="desc">{show.description}</p>
			{/if}
		</div>
		<div class="head-actions">
			<ShowActions showId={show.id} showTitle={show.title} saved={data.saved} user={data.user} />
			{#if data.canEdit}
				<a href={`/shows/${show.id}/tracklist`} class="btn-outline">Edit tracklist</a>
			{/if}
		</div>
	</header>

	{#if upcoming.length > 0}
		<section class="block">
			<h2 class="h-md">Upcoming</h2>
			<ul class="broadcasts">
				{#each upcoming as b, i (b.id)}
					<li class="broadcast" class:today={b.date === data.today}>
						<header>
							<strong>{fmtDate(b.date)}</strong>
							<span class="mono">
								{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}
							</span>
							{#if data.canEdit}
								<a class="edit-mini" href={`/shows/${show.id}/broadcasts/${b.id}/tracklist`}>Edit</a>
							{/if}
						</header>
						<div class="replay">
							{#if b.replay_url}
								{#if replayArtFromUrl(b.replay_url)}
									<img
										class="replay-art"
										src={replayArtFromUrl(b.replay_url) ?? ''}
										alt=""
										width="40"
										height="40"
										loading="lazy"
									/>
								{/if}
								<button class="replay-btn" class:playing={replayActive(b.replay_url)} onclick={() => toggleReplay(b)}>
									{#if replayActive(b.replay_url)}
										<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
										Pause
									{:else}
										<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
										Replay
									{/if}
								</button>
							{:else}
								<span class="replay-soon mono">Replay soon</span>
							{/if}
							<a class="view-show mono" href={`/shows/${show.id}/broadcasts/${b.id}`}>View show →</a>
						</div>
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
					<li class="broadcast">
						<header>
							<strong>{fmtDate(b.date)}</strong>
							<span class="mono">
								{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}
							</span>
							{#if data.canEdit}
								<a class="edit-mini" href={`/shows/${show.id}/broadcasts/${b.id}/tracklist`}>Edit</a>
							{/if}
						</header>
						<div class="replay">
							{#if b.replay_url}
								{#if replayArtFromUrl(b.replay_url)}
									<img
										class="replay-art"
										src={replayArtFromUrl(b.replay_url) ?? ''}
										alt=""
										width="40"
										height="40"
										loading="lazy"
									/>
								{/if}
								<button class="replay-btn" class:playing={replayActive(b.replay_url)} onclick={() => toggleReplay(b)}>
									{#if replayActive(b.replay_url)}
										<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
										Pause
									{:else}
										<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
										Replay
									{/if}
								</button>
							{:else}
								<span class="replay-soon mono">Replay soon</span>
							{/if}
							<a class="view-show mono" href={`/shows/${show.id}/broadcasts/${b.id}`}>View show →</a>
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

	.desc {
		margin: 0.85rem 0 0;
		color: var(--vr-muted);
		max-width: 44rem;
	}

	.block {
		margin-top: 1.5rem;
	}

	.block h2 {
		margin: 0 0 0.75rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 0.5rem;
	}

	.broadcasts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.broadcast {
		border: 1px solid var(--vr-line-muted);
		border-bottom: none;
		background: var(--vr-surface-low);
		padding: 1rem 1.25rem 1.1rem;
	}

	.broadcast:last-child {
		border-bottom: 1px solid var(--vr-line-muted);
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
		padding: 0.15rem 0.6rem;
		font-size: 0.72rem;
		font-family: var(--vr-font-mono);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-decoration: none;
		white-space: nowrap;
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

	.replay-soon {
		color: var(--vr-faint);
		font-size: 0.78rem;
		padding: 0.35rem 0;
	}

	.replay-art {
		width: 40px;
		height: 40px;
		object-fit: cover;
		border: 1px solid var(--vr-line-muted);
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
