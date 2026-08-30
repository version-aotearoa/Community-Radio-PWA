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

<div class="page">
	<header class="head">
		<h1 class="h-lg">Schedule</h1>
		<p class="subtitle mono">Next 30 days of broadcasts. All times local (NZ).</p>
	</header>

	<section class="cycle-strip" aria-label="Station 4-week cycle">
		{#each CYCLE_WEEKS as w, i (w)}
			<span class="cycle-week mono" class:active={cycleWeek === i + 1}>
				{w}
			</span>
		{/each}
		<span class="cycle-note mono">Cycle week {cycleWeek} of 4</span>
	</section>

	{#if days.length === 0}
		<p class="empty mono">Nothing scheduled over the next 30 days.</p>
	{:else}
		<div class="days">
			{#each days as day (day.date)}
				<section class="day" class:today={day.today}>
					<h2 class="day-head">
						{day.label}
						{#if day.today}
							<span class="sticker">Today</span>
						{/if}
					</h2>
					<ul>
						{#each day.items as b (b.id)}
							<li>
								<a class="slot" class:onair={b.onair} href={`/shows/${b.show_id}?from=schedule`}>
									<span class="time mono" class:onair={b.onair}>
										{#if b.onair}
											<span class="live-dot" aria-hidden="true"></span>
										{/if}
										{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}
									</span>
									<span class="show-title h-sm">{b.title}</span>
									{#if b.dj_name && b.kind !== 'event'}
										<span class="dj mono">{b.dj_name}</span>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 72rem;
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

	.cycle-strip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1.75rem;
	}

	.cycle-week {
		padding: 0.4rem 0.85rem;
		border: 1px solid transparent;
		color: var(--vr-muted);
	}

	.cycle-week.active {
		background: var(--vr-text);
		border-color: var(--vr-line);
		color: var(--vr-black);
	}

	.cycle-note {
		color: var(--vr-faint);
		margin-left: 0.5rem;
	}

	.empty {
		color: var(--vr-muted);
	}

	.days {
		display: flex;
		flex-direction: column;
	}

	.day {
		border: 1px solid var(--vr-line-muted);
		border-bottom: none;
	}

	.day:last-child {
		border-bottom: 1px solid var(--vr-line-muted);
	}

	.day.today {
		border-color: var(--vr-line);
	}

	.day-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0;
		padding: 0.7rem 1.25rem;
		background: var(--vr-surface-high);
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vr-text);
	}

	.day-head .sticker {
		padding: 0.3rem 0.45rem;
	}

	.day ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.slot {
		display: flex;
		align-items: baseline;
		gap: 1.25rem;
		padding: 0.85rem 1.25rem;
		border-top: 1px solid var(--vr-line-muted);
		text-decoration: none;
		color: var(--vr-text);
	}

	.day ul li:first-child .slot {
		border-top: none;
	}

	.slot:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.slot.onair {
		background: rgba(255, 255, 255, 0.08);
	}

	.time {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
		width: 7.5rem;
		color: var(--vr-muted);
		font-variant-numeric: tabular-nums;
	}

	.time.onair {
		color: var(--vr-green);
	}

	.live-dot {
		width: 0.5rem;
		height: 0.5rem;
		flex-shrink: 0;
		background: var(--vr-red);
		animation: live-pulse 1.6s ease-in-out infinite;
	}

	.slot:hover .live-dot {
		background: var(--vr-black);
		animation: none;
	}

	.slot:hover .time,
	.slot:hover .dj {
		color: rgba(0, 0, 0, 0.8);
	}

	.show-title {
		min-width: 0;
	}

	.dj {
		margin-left: auto;
		color: var(--vr-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@keyframes live-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}
</style>
