<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	const shows = $derived([...data.shows].sort((a, b) => a.title.localeCompare(b.title)));

	// Fresh server data on every visit — the DB is the source of truth
	// (SPA navigation otherwise reuses the initial SSR snapshot, so edited
	// show cards stay stale until a full reload).
	onMount(() => {
		void invalidateAll();
	});

	const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const ORDINALS = ['1st', '2nd', '3rd', '4th'];

	function airLabel(show: { day_of_week: number; showCycleWeeks: number[] }) {
		const day = DAY_NAMES[show.day_of_week];
		const weeks = show.showCycleWeeks;
		if (weeks.length === 0) return `Every ${day}`;
		return `Every ${weeks.map((w) => ORDINALS[w - 1]).join(' & ')} ${day}`;
	}

	function fmtDate(dateStr: string | null) {
		if (!dateStr) return '';
		return new Intl.DateTimeFormat('en-NZ', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${dateStr}T00:00:00Z`));
	}
</script>

<svelte:head>
	<title>Shows — Version Radio</title>
</svelte:head>

<div class="page">
	<header class="head">
		<h1 class="h-lg">Shows</h1>
		<p class="subtitle mono">Browse the Version Radio lineup — each show has its own page and tracklists.</p>
	</header>

	{#if shows.length === 0}
		<p class="empty mono">No shows yet.</p>
	{:else}
		<ul class="grid">
			{#each shows as show (show.id)}
				<li>
					<a class="card" href={`/shows/${show.id}`}>
						<div class="card-img" class:empty={!show.image && !(show.kind !== 'event' && show.dj_image)}>
							{#if show.image}
								<img src={show.image} alt="" loading="lazy" />
							{:else if show.kind !== 'event' && show.dj_image}
								<img src={show.dj_image} alt="" loading="lazy" />
							{:else}
								<svg viewBox="0 0 80 70" fill="currentColor" aria-hidden="true">
									<path
										fill-rule="evenodd"
										d="M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z"
									/>
								</svg>
							{/if}
						</div>
						<div class="card-body">
							<p class="mono card-meta">
								{#if show.kind === 'event'}
									{fmtDate(show.anchor_date)}
								{:else}
									{airLabel(show)}{#if show.showCycleWeeks.length > 0}<span class="asterisk" aria-hidden="true">*</span>{/if}
								{/if}
							</p>
							<h2 class="h-md">{show.title}</h2>
							{#if show.dj_name && show.kind !== 'event'}
								<p class="dj mono">{show.dj_name}</p>
							{:else}
								<span class="dj-spacer" aria-hidden="true"></span>
							{/if}
							{#if show.description}
								<p class="desc">{show.descriptionText}</p>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>
		<p class="cycle-foot mono"><span aria-hidden="true">*</span> of 4 week cycle</p>
	{/if}
</div>

<style>
	.page {
		padding: 2rem;
	}

	.head {
		margin: 0 0 1.5rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 1rem;
	}

	.head h1 {
		margin: 0;
	}

	.subtitle {
		margin: 0.5rem 0 0;
		color: var(--vr-muted);
	}

	.empty {
		color: var(--vr-muted);
	}

	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		border: 1px solid var(--vr-line);
	}

	.card {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--vr-line);
		margin: -1px 0 0 -1px;
		background: var(--vr-surface);
		text-decoration: none;
		color: var(--vr-text);
		transition: color 150ms, background-color 150ms;
	}

	.card:hover {
		background: #fff;
		color: #000;
	}

	.card-img {
		aspect-ratio: 1.6;
		position: relative;
		background: var(--vr-surface-highest);
	}

	.card-img img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.card-img.empty {
		display: grid;
		place-items: center;
		background: #000;
		color: var(--vr-text);
	}

	.card-img.empty svg {
		width: 96px;
		height: 84px;
	}

	.card-body {
		padding: 1rem 1.1rem 1.2rem;
		min-width: 0;
	}

	.card-meta {
		margin: 0 0 0.5rem;
		color: var(--vr-muted);
		font-variant-numeric: tabular-nums;
	}

	.asterisk {
		color: var(--vr-green);
		margin-left: 0.25rem;
	}

	.card:hover .card-meta {
		color: rgba(0, 0, 0, 0.75);
	}

	.cycle-foot {
		margin: 1rem 0 0;
		color: var(--vr-faint);
		font-size: 0.8rem;
	}

	.cycle-foot span {
		color: var(--vr-green);
	}

	.card-body h2 {
		margin: 0;
	}

	.dj {
		margin: 0.6rem 0 0;
		color: var(--vr-muted);
	}

	/* Reserves the DJ line's vertical space on cards without one so every
	   card in a grid row is equal height. 0.82rem (mono) × 1.15 (line-height). */
	.dj-spacer {
		display: block;
		height: 0.94rem;
		margin-top: 0.6rem;
	}

	.desc {
		margin: 0.5rem 0 0;
		color: var(--vr-muted);
		font-size: 0.9rem;
	}

	.card:hover .desc {
		color: rgba(0, 0, 0, 0.8);
	}
</style>
