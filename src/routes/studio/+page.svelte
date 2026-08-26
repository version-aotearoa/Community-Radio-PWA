<script lang="ts">
	import { Button, Field, Text, Combo } from '@svar-ui/svelte-core';
	import type { ShowRow } from '$lib/server/shows';

	let { data } = $props();

	let title = $state('');
	let description = $state('');
	let dayOfWeek = $state('0');
	let startHours = $state('18');
	let startMinutes = $state('0');
	let duration = $state('60');
	let intervalWeeks = $state('1');
	let saving = $state(false);
	let error = $state('');
	let notice = $state('');

	const shows = $derived(data.shows);

	const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const REPEATS = [
		{ id: '1', label: 'Every week' },
		{ id: '2', label: 'Every 2 weeks' },
		{ id: '4', label: 'Every 4 weeks' }
	];

	function fmtStart(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	async function createShow() {
		error = '';
		notice = '';
		if (!title.trim()) {
			error = 'Give your show a name.';
			return;
		}
		saving = true;
		const res = await fetch('/api/shows', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				title,
				description,
				dayOfWeek: Number(dayOfWeek),
				startMinutes: Number(startHours) * 60 + Number(startMinutes),
				durationMinutes: Number(duration),
				intervalWeeks: Number(intervalWeeks)
			})
		});
		saving = false;
		if (!res.ok) {
			error = 'Could not create the show.';
			return;
		}
		title = '';
		description = '';
		notice = 'Show created.';
		const showsRes = await fetch('/api/shows');
		if (showsRes.ok) {
			const list = (await showsRes.json()) as ShowRow[];
			data.shows = list;
		}
	}
</script>

<svelte:head>
	<title>DJ Studio — Version Radio</title>
</svelte:head>

<h1 class="page-title">DJ Studio</h1>

<section class="card">
	<h2>Your shows</h2>
	{#if shows.length === 0}
		<p class="muted">You don't have any shows yet. Create one below.</p>
	{:else}
		<ul class="show-list">
			{#each shows as show (show.id)}
				<li>
					<a href={`/shows/${show.id}/tracklist`}>
						<strong>{show.title}</strong>
						<span class="meta">
							{DAYS[show.day_of_week]} · {fmtStart(show.start_minutes)}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="card">
	<h2>Create a show</h2>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			createShow();
		}}
	>
		<Field label="Show name">
			<Text bind:value={title} placeholder="e.g. The Lunchtime Hour" css="vr-input" />
		</Field>
		<Field label="Description">
			<Text bind:value={description} placeholder="Short blurb (optional)" css="vr-input" />
		</Field>
		<div class="row">
			<Field label="Day">
				<Combo
					placeholder="Day"
					options={DAYS.map((d, i) => ({ id: String(i), label: d }))}
					bind:value={dayOfWeek}
				/>
			</Field>
			<Field label="Start hour (24h)">
				<Text bind:value={startHours} placeholder="18" css="vr-input" />
			</Field>
			<Field label="Minute">
				<Text bind:value={startMinutes} placeholder="0" css="vr-input" />
			</Field>
			<Field label="Duration (min)">
				<Text bind:value={duration} placeholder="60" css="vr-input" />
			</Field>
			<Field label="Repeats">
				<Combo placeholder="Repeat" options={REPEATS} bind:value={intervalWeeks} />
			</Field>
		</div>
		{#if error}
			<div class="notice bad">{error}</div>
		{/if}
		{#if notice}
			<div class="notice ok">{notice}</div>
		{/if}
		<Button css="vr-cta" type="primary" disabled={saving} onclick={createShow}>
			{saving ? 'Creating…' : 'Create show'}
		</Button>
	</form>
</section>

<style>
	.page-title {
		font-size: 1.6rem;
		margin: 0 0 1.25rem;
	}

	.card {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		padding: 1.25rem 1.5rem;
		margin-bottom: 1.5rem;
	}

	.card h2 {
		font-size: 1.1rem;
		margin: 0 0 1rem;
	}

	.show-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.show-list li {
		border-bottom: 1px solid var(--vr-border);
	}

	.show-list li:last-child {
		border-bottom: none;
	}

	.show-list a {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.8rem 0;
		color: var(--vr-text);
		text-decoration: none;
	}

	.show-list a:hover strong {
		color: var(--vr-accent-strong);
	}

	.meta {
		color: var(--vr-muted);
		font-size: 0.85rem;
	}

	.row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr;
		gap: 0.75rem;
	}

	.notice {
		margin: 0.5rem 0 1rem;
		padding: 0.6rem 0.85rem;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.notice.ok {
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.4);
		color: #6ee7b7;
	}

	.notice.bad {
		background: rgba(255, 77, 109, 0.12);
		border: 1px solid rgba(255, 77, 109, 0.4);
		color: #ffb3c1;
	}
</style>
