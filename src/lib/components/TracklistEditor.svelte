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
	// Live mirror of the grid contents. The grid's internal store is controlled
	// by the `data` prop (resets on reinit), so the mirror is the save source.
	// NOTE: positions in the mirror/grid are 1-based (display numbers); the DB
	// stores 0-based (converted at the boundaries below).
	let editable = $state<TrackRow[]>(untrack(() => toDisplayPos(initialTracks)));

	function toDisplayPos(rows: TrackRow[]): TrackRow[] {
		return rows.map((t) => ({ ...t, position: t.position + 1 }));
	}

	let replayInput = $state(untrack(() => broadcast.replay_url ?? ''));
	let replaySaving = $state(false);
	let replayError = $state('');
	let replayNotice = $state('');
	let descInput = $state(untrack(() => broadcast.description ?? ''));
	let descSaving = $state(false);
	let descError = $state('');
	let descNotice = $state('');
	let fileInput: HTMLInputElement | undefined = $state();

	const GRID_EVENTS = [
		'update-cell',
		'update-row',
		'add-row',
		'delete-row',
		'move-item',
		'copy-row',
		'undo',
		'redo'
	] as const;

	let gridData = $derived(
		editable.map((t) => ({
			id: t.id,
			position: t.position,
			title: t.title,
			artist: t.artist,
			album: t.album,
			url: t.url ?? ''
		}))
	);

	function resyncFromGrid() {
		const rows = gridApi?.getState().data ?? [];
		editable = rows.map((r: any) => ({
			id: r.id,
			position: Number(r.position ?? 0),
			title: String(r.title ?? ''),
			artist: String(r.artist ?? ''),
			album: String(r.album ?? ''),
			url: String(r.url ?? '')
		}));
	}

	const columns = [
		{ id: 'position', header: '#', width: 54 },
		{ id: 'title', header: 'Title', width: 280, editor: 'text' },
		{ id: 'artist', header: 'Artist', width: 240, editor: 'text' },
		{ id: 'album', header: 'Album', width: 240, editor: 'text' },
		{ id: 'url', header: 'Link', width: 260, editor: 'text' }
	];

	function handleInit(api: any) {
		gridApi = api;
		for (const ev of GRID_EVENTS) {
			api.on(ev, () => {
				resyncFromGrid();
				if (ev === 'move-item') setTimeout(renumber, 0);
			});
		}
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
				album: '',
				url: ''
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

	function onGridKeydown(e: KeyboardEvent) {
		// The library's text editor treats Enter as cancel — intercept it in the
		// capture phase and commit the pending cell value instead.
		if (e.key !== 'Enter') return;
		if (!gridApi?.getState().editor) return;
		e.preventDefault();
		e.stopPropagation();
		gridApi.exec('close-editor', {}).catch(() => {});
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
					row: {
						id: crypto.randomUUID(),
						position: ++position,
						title: t.title,
						artist: t.artist,
						album: t.album,
						url: t.url ?? ''
					},
					after: rows.at(-1)?.id
				});
			}
			renumber();
			const withLinks = parsed.filter((t) => t.url).length;
			const linkNote = withLinks ? ` — ${withLinks} with link${withLinks === 1 ? '' : 's'}` : '';
			notice = header
				? `Imported ${parsed.length} tracks from CSV${linkNote}.`
				: `Imported ${parsed.length} tracks (no header row; columns read as title, artist, album${withLinks ? `, link` : ''})${linkNote}.`;
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

	async function saveDescription() {
		descError = '';
		descNotice = '';
		descSaving = true;
		const res = await fetch(`/api/shows/${show.id}/broadcasts/${broadcast.id}/description`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ description: descInput })
		});
		descSaving = false;
		if (!res.ok) {
			descError = await readErrorMessage(res);
			return;
		}
		const saved = (await res.json()) as { description: string };
		descInput = saved.description;
		descNotice = 'Description saved.';
	}

	async function clearDescription() {
		descError = '';
		descNotice = '';
		descSaving = true;
		const res = await fetch(`/api/shows/${show.id}/broadcasts/${broadcast.id}/description`, {
			method: 'DELETE'
		});
		descSaving = false;
		if (!res.ok) {
			descError = await readErrorMessage(res);
			return;
		}
		descInput = '';
		descNotice = 'Description cleared.';
	}

	async function save() {
		error = '';
		notice = '';
		saving = true;
		// Commit any still-open cell editor so its pending value reaches row data.
		if (gridApi) gridApi.exec('close-editor', {}).catch(() => {});
		resyncFromGrid();
		const payload = editable
			.map((t) => ({ title: t.title, artist: t.artist, album: t.album, url: t.url ?? '' }))
			.filter((t) => t.title.trim() !== '' || t.url.trim() !== '');

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
		editable = toDisplayPos(saved);
		saveVersion += 1;
		const embedded = saved.filter((t) => t.embed_id).length;
		notice = `Tracklist saved (${saved.length} tracks)${embedded ? ` — embedded ${embedded} Bandcamp player${embedded === 1 ? '' : 's'}` : '.'}`;
	}
</script>

<div class="page">
<div class="editor-head">
	<div>
		<p class="eyebrow mono"><a href={breadcrumbHref}>DJ Studio</a> / Show</p>
		<h1>{show.title}</h1>
		<p class="airdate mono">
			Broadcast: <strong>{broadcast.date}</strong> · {fmtTime(broadcast.start_minutes)}
		</p>
	</div>
	<div class="actions">
		<Button css="vr-cta ghost" onclick={() => fileInput?.click()}>Import CSV</Button>
		<Button css="vr-cta ghost" onclick={addTrack}>+ Add track</Button>
		<Button css="vr-cta ghost" onclick={deleteSelected}>Delete selected</Button>
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
	<Button css="vr-cta ghost" disabled={replaySaving} onclick={saveReplay}>
		{replaySaving ? 'Saving…' : 'Save'}
	</Button>
	<Button css="vr-cta ghost" disabled={replaySaving} onclick={clearReplay}>Clear</Button>
	<p class="hint">Copy the recording's link from the AzuraCast on-demand player. Accepts a 24-char track id or a full download link.</p>
	{#if replayError}
		<p class="replay-msg bad">{replayError}</p>
	{/if}
	{#if replayNotice}
		<p class="replay-msg ok">{replayNotice}</p>
	{/if}
</div>

<div class="desc-row">
	<label for="broadcast-desc">Description</label>
	<textarea
		id="broadcast-desc"
		rows={3}
		placeholder="Episode description"
		bind:value={descInput}
	></textarea>
	<Button css="vr-cta ghost" disabled={descSaving} onclick={saveDescription}>
		{descSaving ? 'Saving…' : 'Save'}
	</Button>
	<Button css="vr-cta ghost" disabled={descSaving} onclick={clearDescription}>Clear</Button>
	{#if descError}
		<p class="replay-msg bad">{descError}</p>
	{/if}
	{#if descNotice}
		<p class="replay-msg ok">{descNotice}</p>
	{/if}
</div>

{#if error}
	<div class="notice bad">{error}</div>
{/if}
{#if notice}
	<div class="notice ok">{notice}</div>
{/if}

<div class="grid-wrap" onkeydowncapture={onGridKeydown}>
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
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 76rem;
	}

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
		font-size: 0.82rem;
		color: var(--vr-muted);
	}

	.eyebrow a {
		color: var(--vr-text);
		text-decoration: underline;
	}

	h1 {
		margin: 0.4rem 0 0;
		font-family: var(--vr-font-headline);
		font-size: 2.25rem;
		font-weight: 400;
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0.01em;
	}

	.airdate {
		margin: 0.5rem 0 0;
		color: var(--vr-muted);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.grid-wrap {
		border: 1px solid var(--vr-line);
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
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
	}

	.desc-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin: 0 0 1rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
	}

	.desc-row label {
		font-size: 0.85rem;
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.desc-row textarea {
		flex: 1;
		min-width: 200px;
		background: transparent;
		color: var(--vr-text);
		border: 1px solid var(--vr-line-muted);
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
		resize: vertical;
	}

	.desc-row textarea:focus {
		outline: none;
		border-color: var(--vr-line);
	}

	.replay-row label {
		font-size: 0.85rem;
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.replay-row input {
		flex: 1;
		min-width: 200px;
		background: transparent;
		color: var(--vr-text);
		border: 1px solid var(--vr-line-muted);
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
		font-family: var(--vr-font-body);
	}

	.replay-row input:focus {
		outline: none;
		border-color: #fff;
		box-shadow: 0 0 0 2px #fff, inset 0 0 0 1px #fff;
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
		color: var(--vr-muted);
	}

	.replay-msg.bad {
		color: var(--vr-text);
	}

	.notice {
		margin: 0 0 0.75rem;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--vr-line);
		font-size: 0.9rem;
	}

	.notice.ok {
		color: var(--vr-muted);
	}

	.notice.bad {
		color: var(--vr-text);
	}
</style>
