<script lang="ts">
	let { data } = $props();

	const upcoming = $derived(data.upcoming);
	const cycleWeek = $derived(data.cycleWeek);

	interface Day {
		date: string;
		label: string;
		today: boolean;
		items: typeof upcoming;
	}

	const days = $derived.by<Day[]>(() => {
		const groups = new Map<string, typeof upcoming>();
		for (const b of upcoming) {
			const list = groups.get(b.date) ?? [];
			list.push(b);
			groups.set(b.date, list);
		}
		return Array.from(groups.entries()).map(([date, items]) => ({
			date,
			label: formatDate(date),
			today: date === data.today,
			items
		}));
	});

	function formatDate(dateStr: string) {
		return new Intl.DateTimeFormat('en-NZ', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		}).format(new Date(`${dateStr}T00:00:00Z`));
	}

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	const CYCLE_WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
</script>

<svelte:head>
	<title>Schedule — Version Radio</title>
</svelte:head>

<h1 class="page-title">Schedule</h1>
<p class="subtitle">Next 30 days of broadcasts. All times local (NZ).</p>

<section class="cycle-strip" aria-label="Station 4-week cycle">
	{#each CYCLE_WEEKS as w, i (w)}
		<span class="cycle-week" class:active={cycleWeek === i + 1}>
			{w}
		</span>
	{/each}
	<span class="cycle-note">Cycle week {cycleWeek} of 4</span>
</section>

{#if days.length === 0}
	<p class="empty">Nothing scheduled over the next 30 days.</p>
{:else}
	<div class="days">
		{#each days as day (day.date)}
			<section class="day" class:today={day.today}>
				<h2>{day.label} {#if day.today}<span class="chip">Today</span>{/if}</h2>
				<ul>
					{#each day.items as b (b.id)}
						<li>
							<a class="slot" href={`/shows/${b.show_id}`}>
								<span class="time">{fmtTime(b.start_minutes)}</span>
								<span class="show">
									<strong>{b.title}</strong>
									{#if b.dj_name}
										<span class="dj">{b.dj_name}</span>
									{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
{/if}

<style>
	.page-title {
		font-size: 1.6rem;
		margin: 0 0 0.25rem;
	}

	.subtitle {
		color: var(--vr-muted);
		margin: 0 0 1.25rem;
	}

	.cycle-strip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.cycle-week {
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--vr-border);
		border-radius: 999px;
		color: var(--vr-muted);
		font-size: 0.85rem;
	}

	.cycle-week.active {
		background: var(--vr-accent);
		border-color: var(--vr-accent);
		color: #0b0b11;
		font-weight: 600;
	}

	.cycle-note {
		color: var(--vr-muted);
		font-size: 0.8rem;
	}

	.empty {
		color: var(--vr-muted);
	}

	.days {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.day {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		padding: 1rem 1.25rem;
	}

	.day.today {
		border-color: var(--vr-accent);
		box-shadow: 0 0 0 1px var(--vr-accent);
	}

	.day h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--vr-muted);
	}

	.day.today h2 {
		color: var(--vr-accent-strong);
	}

	.chip {
		background: var(--vr-accent);
		color: #0b0b11;
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.slot {
		display: flex;
		align-items: baseline;
		gap: 0.9rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--vr-border);
		border-radius: 10px;
		background: var(--vr-surface-raised);
		text-decoration: none;
		color: var(--vr-text);
	}

	.slot:hover {
		border-color: var(--vr-accent);
	}

	.time {
		color: var(--vr-accent-strong);
		font-variant-numeric: tabular-nums;
		font-size: 0.95rem;
		white-space: nowrap;
	}

	.show strong {
		display: block;
	}

	.dj {
		font-size: 0.85rem;
		color: var(--vr-muted);
	}
</style>
