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

<div class="head">
	<h1>Shows</h1>
	<p class="subtitle">Browse the Version Radio lineup — each show has its own page and tracklists.</p>
</div>

{#if shows.length === 0}
	<p class="empty">No shows yet.</p>
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
						<h2>{show.title}</h2>
						<p class="meta">
							{DAY_NAMES[show.day_of_week]}s · {fmtTime(show.start_minutes)}–{fmtTime(
								show.start_minutes + show.duration_minutes
							)} · {cycleLabel(show)}
						</p>
						{#if show.description}
							<p class="desc">{show.description}</p>
						{/if}
						{#if show.dj_name}
							<p class="dj">{show.dj_name}</p>
						{/if}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.head {
		margin-bottom: 1.25rem;
	}

	h1 {
		margin: 0;
		font-size: 1.6rem;
	}

	.subtitle {
		color: var(--vr-muted);
		margin: 0.35rem 0 0;
	}

	.empty {
		color: var(--vr-muted);
	}

	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.card {
		display: grid;
		grid-template-columns: 96px 1fr;
		align-items: stretch;
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		overflow: hidden;
		text-decoration: none;
		color: var(--vr-text);
		height: 100%;
	}

	.card:hover {
		border-color: var(--vr-accent);
	}

	.card-img {
		position: relative;
		min-height: 100%;
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
		background: linear-gradient(140deg, var(--vr-accent), var(--vr-live));
	}

	.card-img.empty span {
		font-size: 2rem;
		font-weight: 700;
		color: #0b0b11;
	}

	.card-body {
		padding: 1rem 1.1rem;
		min-width: 0;
	}

	.card-body h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.meta {
		margin: 0.5rem 0 0;
		color: var(--vr-accent-strong);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.desc {
		margin: 0.5rem 0 0;
		color: var(--vr-muted);
		font-size: 0.9rem;
	}

	.dj {
		margin: 0.75rem 0 0;
		font-size: 0.85rem;
		color: var(--vr-live);
	}
</style>
