<script lang="ts">
	let { data } = $props();

	const shows = $derived([...data.shows].sort((a, b) => a.title.localeCompare(b.title)));

	const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function cycleLabel(show: { interval_weeks: number }) {
		if (show.interval_weeks === 1) return 'Every week';
		return `Every ${show.interval_weeks} weeks`;
	}

	function initial(title: string) {
		return title.charAt(0).toUpperCase();
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
						<div class="card-img" class:empty={!show.image && !show.dj_image}>
							{#if show.image}
								<img src={show.image} alt="" loading="lazy" />
							{:else if show.dj_image}
								<img src={show.dj_image} alt="" loading="lazy" />
							{:else}
								<span>{initial(show.title)}</span>
							{/if}
						</div>
						<div class="card-body">
							<p class="mono card-meta">
								{DAY_NAMES[show.day_of_week]}s · {fmtTime(show.start_minutes)}–{fmtTime(
									show.start_minutes + show.duration_minutes
								)} · {cycleLabel(show)}
							</p>
							<h2 class="h-md">{show.title}</h2>
							{#if show.dj_name}
								<p class="dj mono">{show.dj_name}</p>
							{/if}
							{#if show.description}
								<p class="desc">{show.description}</p>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>
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
		filter: grayscale(1);
		transition: filter 150ms;
	}

	.card:hover .card-img img {
		filter: grayscale(0);
	}

	.card-img.empty {
		display: grid;
		place-items: center;
		color: var(--vr-faint);
	}

	.card-img.empty span {
		font-size: 2rem;
		font-weight: 700;
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

	.card:hover .card-meta {
		color: rgba(0, 0, 0, 0.75);
	}

	.card-body h2 {
		margin: 0;
	}

	.dj {
		margin: 0.6rem 0 0;
		color: var(--vr-muted);
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
