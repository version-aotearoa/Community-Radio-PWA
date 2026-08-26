<script lang="ts">
	import { untrack } from 'svelte';
	import { Grid, WillowDark } from '@svar-ui/svelte-grid';
	import { Button } from '@svar-ui/svelte-core';
	import { parseTracksCsv } from '$lib/csv';
	import type { ShowRow, BroadcastRow, TrackRow } from '$lib/server/shows';

	let {
		show,
		broadcast,
		tracks: initialTracks,
		breadcrumbHref = '/studio'
	}: {
		show: ShowRow;
		broadcast: BroadcastRow;
		tracks: TrackRow[];
		breadcrumbHref?: string;
	} = $props();

	let gridApi = $state<any>(null);
	let saveVersion = $state(0);
	let saving = $state(false);
	let error = $state('');
	let notice = $state('');
	let tracks = $state<TrackRow[]>(untrack(() => initialTracks));

	let replayInput = $state(untrack(() => broadcast.replay_url ?? ''));
	let replaySaving = $state(false);
	let replayError = $state('');
	let replayNotice = $state('');
	let fileInput: HTMLInputElement | undefined = $state();

	let gridData = $derived(
		tracks.map((t) => ({
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

	/** Extract a readable error from a failed save response (JSON body, text, or status). */
	async function readErrorMessage(res: Response): Promise<string> {
		const text = await res.text().catch(() => '');
		try {
			const body = JSON.parse(text) as { error?: unknown };
			if (typeof body.error === 'string' && body.error.trim() !== '') return body.error;
		} catch {
			// not JSON
		}
		if (text.trim() !== '' && !text.trimStart().startsWith('<')) return text.trim().slice(0, 200);
		return `Request failed (${res.status})`;
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

	async function onCsvPicked(el: HTMLInputElement) {
		error = '';
		const file = el.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const { tracks: parsed, header } = parseTracksCsv(text);
			const rows = gridApi?.getState().data ?? [];
			let position = rows.length;
			for (const t of parsed) {
				await gridApi.exec('add-row', {
					row: { id: crypto.randomUUID(), position: ++position, title: t.title, artist: t.artist, album: t.album },
					after: rows.at(-1)?.id
				});
			}
			renumber();
			notice = header
				? `Imported ${parsed.length} tracks from CSV.`
				: `Imported ${parsed.length} tracks (no header row; columns read as title, artist, album).`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not read that file.';
		} finally {
			el.value = '';
		}
	}

	async function saveReplay() {
		replayError = '';
		replayNotice = '';
		replaySaving = true;
		const url = replayInput.trim();
		const res = await fetch(`/api/shows/${show.id}/broadcasts/${broadcast.id}/replay`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ url: url || null })
		});
		replaySaving = false;
		if (!res.ok) {
			replayError = await readErrorMessage(res);
			return;
		}
		const saved = (await res.json()) as { replayUrl: string | null };
		replayInput = saved.replayUrl ?? '';
		replayNotice = saved.replayUrl ? 'Replay link saved.' : 'Replay link cleared.';
	}

	async function clearReplay() {
		replayError = '';
		replayNotice = '';
		replaySaving = true;
		const res = await fetch(`/api/shows/${show.id}/broadcasts/${broadcast.id}/replay`, {
			method: 'DELETE'
		});
		replaySaving = false;
		if (!res.ok) {
			replayError = await readErrorMessage(res);
			return;
		}
		replayInput = '';
		replayNotice = 'Replay link cleared.';
	}

	async function save() {
		error = '';
		notice = '';
		saving = true;
		const rows = gridApi?.getState().data ?? [];
		const payload = rows
			.map((r: any) => ({ title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '' }))
			.filter((t: { title: string }) => t.title.trim() !== '');

		const res = await fetch(`/api/shows/${show.id}/broadcasts/${broadcast.id}/tracklist`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ tracks: payload })
		});
		saving = false;
		if (!res.ok) {
			error = 'Save failed. Please try again.';
			return;
		}
		const saved = (await res.json()) as TrackRow[];
		tracks = saved;
		saveVersion += 1;
		notice = `Tracklist saved (${saved.length} tracks).`;
	}
</script>

<div class="editor-head">
	<div>
		<p class="eyebrow"><a href={breadcrumbHref}>DJ Studio</a> / Show</p>
		<h1>{show.title}</h1>
		<p class="airdate">
			Broadcast: <strong>{broadcast.date}</strong> · {fmtTime(broadcast.start_minutes)}
		</p>
	</div>
	<div class="actions">
		<Button css="vr-ghost" onclick={() => fileInput?.click()}>Import CSV</Button>
		<Button css="vr-ghost" onclick={addTrack}>+ Add track</Button>
		<Button css="vr-ghost" onclick={deleteSelected}>Delete selected</Button>
		<Button css="vr-cta" type="primary" disabled={saving} onclick={save}>
			{saving ? 'Saving…' : 'Save tracklist'}
		</Button>
	</div>
</div>

<input
	bind:this={fileInput}
	type="file"
	accept=".csv,.tsv,text/csv,text/tab-separated-values"
	class="hidden-input"
	onchange={(e) => onCsvPicked(e.currentTarget)}
/>

<div class="replay-row">
	<label for="replay-link">Replay link</label>
	<input
		id="replay-link"
		type="url"
		placeholder="Paste the on-demand track id or download link"
		bind:value={replayInput}
		onkeydown={(e) => e.key === 'Enter' && saveReplay()}
	/>
	<Button css="vr-ghost" disabled={replaySaving} onclick={saveReplay}>
		{replaySaving ? 'Saving…' : 'Save'}
	</Button>
	<Button css="vr-ghost" disabled={replaySaving} onclick={clearReplay}>Clear</Button>
	<p class="hint">Copy the recording's link from the AzuraCast on-demand player. Accepts a 24-char track id or a full download link.</p>
	{#if replayError}
		<p class="replay-msg bad">{replayError}</p>
	{/if}
	{#if replayNotice}
		<p class="replay-msg ok">{replayNotice}</p>
	{/if}
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

	.airdate {
		margin: 0.3rem 0 0;
		color: var(--vr-muted);
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

	.hidden-input {
		display: none;
	}

	.replay-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin: 0.5rem 0 1rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--vr-border);
		border-radius: 12px;
		background: var(--vr-surface);
	}

	.replay-row label {
		font-size: 0.9rem;
		color: var(--vr-muted);
	}

	.replay-row input {
		flex: 1;
		min-width: 200px;
		background: var(--vr-surface-raised);
		color: var(--vr-text);
		border: 1px solid var(--vr-border);
		border-radius: 8px;
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
	}

	.replay-row .hint {
		flex-basis: 100%;
		margin: 0.25rem 0 0;
		font-size: 0.78rem;
	}

	.replay-msg {
		flex-basis: 100%;
		margin: 0.35rem 0 0;
		font-size: 0.85rem;
	}

	.replay-msg.ok {
		color: #6ee7b7;
	}

	.replay-msg.bad {
		color: #ffb3c1;
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
