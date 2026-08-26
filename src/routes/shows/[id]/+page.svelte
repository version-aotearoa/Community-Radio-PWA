<script lang="ts">
	import { Button } from '@svar-ui/svelte-core';

	let { data } = $props();

	const show = $derived(data.show);
	const upcoming = $derived(data.upcoming);
	const past = $derived(data.past);
	const tracks = $derived(data.tracks);

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
</script>

<svelte:head>
	<title>{show.title} — Version Radio</title>
</svelte:head>

<div class="head">
	<div>
		<p class="eyebrow"><a href="/schedule">← Schedule</a></p>
		<h1>{show.title}</h1>
		<p class="subtitle">
			{DAY_NAMES[show.day_of_week]}s · {fmtTime(show.start_minutes)}–{fmtTime(
				show.start_minutes + show.duration_minutes
			)} · {cycleLabel(show)} · {show.dj_name || 'Version Radio'}
		</p>
		{#if show.description}
			<p class="desc">{show.description}</p>
		{/if}
	</div>
	{#if data.canEdit}
		<a href={`/shows/${show.id}/tracklist`} class="edit-link">Edit tracklist</a>
	{/if}
</div>

{#if upcoming.length > 0}
	<section>
		<h2>Upcoming</h2>
		<ul class="broadcasts">
			{#each upcoming as b (b.id)}
				<li class="broadcast" class:today={b.date === data.today}>
					<header>
						<strong>{fmtDate(b.date)}</strong>
						<span>{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}</span>
					</header>
					{#if tracks[b.id]?.length}
						<p class="hint">Tracklist available after the show.</p>
					{:else}
						<p class="hint">Tracklist will be added after the show.</p>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if past.length > 0}
	<section>
		<h2>Past broadcasts</h2>
		<ul class="broadcasts">
			{#each past as b (b.id)}
				<li class="broadcast">
					<header>
						<strong>{fmtDate(b.date)}</strong>
						<span>{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}</span>
					</header>
					{#if tracks[b.id]?.length}
						<ol class="tracklist">
							{#each tracks[b.id] as t (t.id)}
								<li>
									<span class="num">{t.position + 1}</span>
									<span class="track-title">{t.title}</span>
									{#if t.artist}<span class="artist">{t.artist}</span>{/if}
									{#if t.album}<span class="album">{t.album}</span>{/if}
								</li>
							{/each}
						</ol>
					{:else}
						<p class="hint">No tracklist for this broadcast.</p>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if upcoming.length === 0 && past.length === 0}
	<p class="hint">No scheduled broadcasts yet.</p>
{/if}

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.85rem;
	}

	.eyebrow a {
		color: var(--vr-accent-strong);
		text-decoration: none;
	}

	h1 {
		margin: 0;
		font-size: 1.8rem;
	}

	.subtitle {
		margin: 0.4rem 0 0;
		color: var(--vr-muted);
	}

	.desc {
		margin: 0.75rem 0 0;
		color: var(--vr-muted);
	}

	.edit-link {
		border: 1px solid var(--vr-border);
		border-radius: 8px;
		padding: 0.4rem 0.85rem;
		color: var(--vr-live);
		text-decoration: none;
		font-size: 0.9rem;
		white-space: nowrap;
	}

	h2 {
		font-size: 1.1rem;
		margin: 1.25rem 0 0.75rem;
	}

	.broadcasts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.broadcast {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		padding: 1rem 1.25rem;
	}

	.broadcast.today {
		border-color: var(--vr-accent);
		box-shadow: 0 0 0 1px var(--vr-accent);
	}

	.broadcast header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.broadcast header span {
		color: var(--vr-accent-strong);
		font-variant-numeric: tabular-nums;
	}

	.hint {
		color: var(--vr-muted);
		font-size: 0.9rem;
		margin: 0;
	}

	.tracklist {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.tracklist li {
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
	}

	.num {
		color: var(--vr-muted);
		font-variant-numeric: tabular-nums;
		width: 1.4rem;
		flex-shrink: 0;
	}

	.track-title {
		font-weight: 600;
	}

	.artist {
		color: var(--vr-muted);
	}

	.album {
		color: var(--vr-muted);
		font-size: 0.85rem;
	}
</style>
