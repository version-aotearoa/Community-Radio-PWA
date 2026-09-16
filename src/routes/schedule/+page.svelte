<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { cycleWeekOf, startOfWeek } from '$lib/cycle';

	let { data } = $props();

	const upcoming = $derived(data.upcoming);

	interface Day {
		date: string;
		label: string;
		today: boolean;
		tomorrow: boolean;
		items: typeof upcoming;
	}

	interface Week {
		monday: string;
		cycleWeek: number;
		range: string;
		days: Day[];
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
			tomorrow: date === data.tomorrow,
			items
		}));
	});

	// Mon–Sun calendar weeks; each divider is labelled with its station cycle week.
	const weeks = $derived.by<Week[]>(() => {
		const groups = new Map<string, Day[]>();
		for (const day of days) {
			const monday = startOfWeek(day.date);
			const list = groups.get(monday) ?? [];
			list.push(day);
			groups.set(monday, list);
		}
		return Array.from(groups.entries()).map(([monday, weekDays]) => ({
			monday,
			cycleWeek: cycleWeekOf(monday),
			range: formatWeekRange(monday),
			days: weekDays
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

	/** Mon–Sun range, e.g. "15–21 Sep" (same month) or "29 Sep – 5 Oct". */
	function formatWeekRange(monday: string): string {
		const start = new Date(`${monday}T00:00:00Z`);
		const end = new Date(start);
		end.setUTCDate(end.getUTCDate() + 6);
		const day = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', timeZone: 'UTC' });
		const dayMonth = new Intl.DateTimeFormat('en-NZ', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
		return start.getUTCMonth() === end.getUTCMonth()
			? `${day.format(start)}–${dayMonth.format(end)}`
			: `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
	}

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>Schedule — Version Radio</title>
</svelte:head>

<Seo />

<div class="page">
	<header class="head">
		<h1 class="h-lg">Schedule</h1>
		<p class="subtitle mono">Next 30 days of broadcasts. All times local (NZ).</p>
	</header>

	{#if days.length === 0}
		<p class="empty mono">Nothing scheduled over the next 30 days.</p>
	{:else}
		<div class="weeks">
			{#each weeks as week (week.monday)}
				<div class="week">
					<h2 class="week-divider mono">
						Week {week.cycleWeek} of 4 <span class="week-range">· {week.range}</span>
					</h2>
					{#each week.days as day (day.date)}
						<section class="day" class:today={day.today} class:tomorrow={day.tomorrow}>
							<h3 class="day-head">
								<span class="day-label">
									{day.label}
									{#if day.today}
										<span class="sticker">Today</span>
									{:else if day.tomorrow}
										<span class="sticker">Tomorrow</span>
									{/if}
								</span>
							</h3>
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

	.empty {
		color: var(--vr-muted);
	}

	.weeks {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.week {
		border: 1px solid var(--vr-line-muted);
	}

	/* The one banded header: week divider with its station cycle week + date range. */
	.week-divider {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin: 0;
		padding: 0.7rem 1.25rem;
		background: var(--vr-surface-high);
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--vr-text);
	}

	.week-range {
		color: var(--vr-muted);
		font-weight: 400;
	}

	/* Slim per-day label (the week divider carries the hierarchy). */
	.day {
		border-top: 1px solid var(--vr-line-muted);
	}

	.day.today,
	.day.tomorrow {
		border-top-color: var(--vr-line);
	}

	.day-head {
		margin: 0;
		padding: 0.5rem 1.25rem;
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vr-muted);
	}

	.day.today .day-head,
	.day.tomorrow .day-head {
		color: var(--vr-text);
	}

	.day-label {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.day-head .sticker {
		padding: 0.25rem 0.45rem;
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

	.slot:hover .dj {
		color: rgba(0, 0, 0, 0.8);
	}

	.slot:hover .time,
	.slot:hover .time.onair {
		color: rgba(0, 0, 0, 0.8);
	}

	.show-title {
		min-width: 0;
	}

	.dj {
		color: var(--vr-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 720px) {
		.slot .dj {
			display: none;
		}
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
