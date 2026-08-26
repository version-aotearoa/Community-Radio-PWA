<script lang="ts">
	import { Grid, WillowDark } from '@svar-ui/svelte-grid';
	import { Button } from '@svar-ui/svelte-core';
	import type { TrackRow } from '$lib/server/shows';

	let { data } = $props();

	const show = $derived(data.show);
	const broadcast = $derived(data.broadcast);

	let gridApi = $state<any>(null);
	let saveVersion = $state(0);
	let saving = $state(false);
	let error = $state('');
	let notice = $state('');

	let gridData = $derived(
		data.tracks.map((t) => ({
			id: t.id,
			position: t.position + 1,
			title: t.title,
			artist: t.artist,
			album: t.album
		}))
	);

	const columns = [
		{ id: 'position', header: '#', width: 54 },
		{ id: 'title', header: 'Title', width: 280, editor: 'text' },
		{ id: 'artist', header: 'Artist', width: 240, editor: 'text' },
		{ id: 'album', header: 'Album', width: 240, editor: 'text' }
	];

	function handleInit(api: any) {
		gridApi = api;
		api.on('move-item', () => renumber());
	}

	function renumber() {
		const rows = gridApi?.getState().data ?? [];
		rows.forEach((row: any, i: number) => {
			if (row.position !== i + 1) {
				gridApi.exec('update-row', { id: row.id, row: { position: i + 1 } });
			}
		});
	}

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	async function addTrack() {
		const rows = gridApi?.getState().data ?? [];
		await gridApi.exec('add-row', {
			row: {
				id: crypto.randomUUID(),
				position: rows.length + 1,
				title: '',
				artist: '',
				album: ''
			},
			after: rows.at(-1)?.id,
			select: true
		});
		renumber();
	}

	async function deleteSelected() {
		const selected = gridApi?.getState().selectedRows ?? [];
		for (const id of selected) {
			await gridApi.exec('delete-row', { id });
		}
		renumber();
	}

	async function save() {
		error = '';
		notice = '';
		saving = true;
		const rows = gridApi?.getState().data ?? [];
		const tracks = rows
			.map((r: any) => ({ title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '' }))
			.filter((t: { title: string }) => t.title.trim() !== '');

		const res = await fetch(`/api/shows/${show.id}/tracklist`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ tracks })
		});
		saving = false;
		if (!res.ok) {
			error = 'Save failed. Please try again.';
			return;
		}
		const saved = (await res.json()) as TrackRow[];
		data.tracks = saved;
		saveVersion += 1;
		notice = `Tracklist saved (${saved.length} tracks).`;
	}
</script>

<svelte:head>
	<title>{show.title} — tracklist — Version Radio</title>
</svelte:head>

<div class="editor-head">
	<div>
		<p class="eyebrow"><a href="/studio">DJ Studio</a> / Show</p>
		<h1>{show.title}</h1>
		<p class="airdate">
			Broadcast: <strong>{broadcast.date}</strong> · {fmtTime(broadcast.start_minutes)}
		</p>
	</div>
	<div class="actions">
		<Button css="vr-ghost" onclick={addTrack}>+ Add track</Button>
		<Button css="vr-ghost" onclick={deleteSelected}>Delete selected</Button>
		<Button css="vr-cta" type="primary" disabled={saving} onclick={save}>
			{saving ? 'Saving…' : 'Save tracklist'}
		</Button>
	</div>
</div>

{#if error}
	<div class="notice bad">{error}</div>
{/if}
{#if notice}
	<div class="notice ok">{notice}</div>
{/if}

<div class="grid-wrap">
	{#key saveVersion}
		<WillowDark>
			<Grid
				{columns}
				data={gridData}
				reorder={true}
				undo={true}
				select={true}
				init={handleInit}
			/>
		</WillowDark>
	{/key}
</div>

<p class="hint">Click a cell to edit it. Drag rows to reorder. Use Ctrl+Z / Ctrl+Y to undo and redo.</p>

<style>
	.editor-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.85rem;
		color: var(--vr-muted);
	}

	.eyebrow a {
		color: var(--vr-accent-strong);
		text-decoration: none;
	}

	h1 {
		margin: 0.2rem 0 0;
		font-size: 1.5rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.grid-wrap {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		padding: 0.75rem;
		height: 440px;
		overflow: hidden;
	}

	.hint {
		color: var(--vr-muted);
		font-size: 0.85rem;
		margin-top: 0.75rem;
	}

	.notice {
		margin: 0 0 0.75rem;
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
