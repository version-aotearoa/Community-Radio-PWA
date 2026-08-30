<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
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
	let showOverlap = $state('');
	let cycleWeekSel = $state('');

	let createKind = $state<'show' | 'event'>('show');
	let showImage = $state('');
	let evTitle = $state('');
	let evDate = $state('');
	let evStartHours = $state('18');
	let evStartMinutes = $state('0');
	let evReplay = $state('');
	let evDescription = $state('');
	let evImage = $state('');
	let evSaving = $state(false);
	let evError = $state('');
	let evNotice = $state('');
	let evOverlap = $state('');

	async function createEvent() {
		evError = '';
		evNotice = '';
		evOverlap = '';
		if (!evTitle.trim()) {
			evError = 'Give the event a name.';
			return;
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(evDate.trim())) {
			evError = 'Date must be YYYY-MM-DD.';
			return;
		}
		evSaving = true;
		const res = await fetch('/api/shows', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				title: evTitle,
				kind: 'event',
				date: evDate.trim(),
				startMinutes: Number(evStartHours) * 60 + Number(evStartMinutes),
				durationMinutes: 60,
				replayUrl: evReplay,
				description: evDescription,
				image: evImage
			})
		});
		evSaving = false;
		if (!res.ok) {
			const body = (await res.json().catch(() => null)) as { error?: string } | null;
			evError = body?.error ?? `Create failed (${res.status})`;
			return;
		}
		const saved = (await res.json()) as { overlap?: { title: string }[] };
		evOverlap = overlapText(saved.overlap);
		evTitle = '';
		evDate = '';
		evReplay = '';
		evDescription = '';
		evImage = '';
		evNotice = 'Event created.';
	}

	const shows = $derived(data.shows);
	const isAdmin = $derived(data.user?.role === 'admin');

	interface AdminUser {
		id: string;
		name: string;
		email: string;
		role: 'listener' | 'dj' | 'admin';
		active: number;
		createdAt: string;
	}

	interface ChatMessage {
		id: string;
		ts: number;
		name: string;
		content: string;
		userId?: string | null;
	}

	let adminUsers = $state<AdminUser[]>([]);
	const emailById = $derived(new Map(adminUsers.map((u) => [u.id, u.email])));
	const djUsers = $derived(adminUsers.filter((u) => u.role === 'dj' || u.role === 'admin'));
	let chatMessages = $state<ChatMessage[]>([]);
	let chatLoaded = $state(false);
	let purgeName = $state('');
	let activeTab = $state('shows');
	let adminError = $state('');

	let epShowId = $state(untrack(() => data.shows[0]?.id ?? ''));
	let epDate = $state('');
	let epStartHours = $state('18');
	let epStartMinutes = $state('0');
	let epDuration = $state('60');
	let epReplay = $state('');
	let epSaving = $state(false);
	let epError = $state('');
	let epNotice = $state('');
	let epOverlap = $state('');

	async function addEpisode() {
		epError = '';
		epNotice = '';
		epOverlap = '';
		if (!epShowId) {
			epError = 'Pick a show.';
			return;
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(epDate.trim())) {
			epError = 'Date must be YYYY-MM-DD.';
			return;
		}
		epSaving = true;
		const res = await fetch('/api/admin/broadcasts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				showId: epShowId,
				date: epDate.trim(),
				startMinutes: Number(epStartHours) * 60 + Number(epStartMinutes),
				durationMinutes: Number(epDuration),
				replayUrl: epReplay
			})
		});
		epSaving = false;
		if (!res.ok) {
			const body = (await res.json().catch(() => null)) as { error?: string } | null;
			epError = body?.error ?? `Save failed (${res.status})`;
			return;
		}
		const saved = (await res.json()) as { overlap?: { title: string }[] };
		epOverlap = overlapText(saved.overlap);
		epDate = '';
		epReplay = '';
		epNotice = 'Episode added.';
	}

	let userRoleFilter = $state<'all' | 'listener' | 'dj' | 'admin'>('all');
	let userSearch = $state('');
	let userSort = $state<'newest' | 'oldest' | 'name'>('newest');

	const filteredUsers = $derived.by(() => {
		const q = userSearch.trim().toLowerCase();
		const list = adminUsers.filter(
			(u) =>
				(userRoleFilter === 'all' || u.role === userRoleFilter) &&
				(!q || `${u.name} ${u.email}`.toLowerCase().includes(q))
		);
		if (userSort === 'name') {
			return [...list].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
		}
		if (userSort === 'oldest') return [...list].reverse();
		return list;
	});

	interface RowFeedback {
		text: string;
		ok: boolean;
	}

	let userFeedback = $state<Record<string, RowFeedback>>({});
	let showFeedback = $state<Record<string, RowFeedback>>({});

	interface FeaturedCandidate {
		id: string;
		date: string;
		featured: number;
		title: string;
	}

	let featuredList = $state<FeaturedCandidate[]>([]);
	let featuredLoaded = $state(false);
	let featuredFeedback = $state('');

	async function loadFeatured() {
		const res = await fetch('/api/admin/featured');
		if (res.ok) {
			featuredList = await res.json();
			featuredLoaded = true;
		}
	}

	async function toggleFeatured(c: FeaturedCandidate) {
		featuredFeedback = '';
		const target = c.featured === 1 ? false : true;
		const res = await fetch('/api/admin/featured', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ broadcastId: c.id, featured: target })
		});
		if (!res.ok) {
			const body = (await res.json().catch(() => null)) as { error?: string } | null;
			featuredFeedback = body?.error ?? `Save failed (${res.status})`;
			return;
		}
		c.featured = target ? 1 : 0;
	}

	let editingShowId = $state('');
	let ef = $state({
		title: '',
		description: '',
		image: '',
		djId: '',
		djHandle: '',
		dayOfWeek: '0',
		startHours: '18',
		startMinutes: '0',
		duration: '60',
		intervalWeeks: '1',
		cycleWeek: '',
		date: '',
		replay: ''
	});
	let efSaving = $state(false);
	let efError = $state('');
	let efOverlap = $state('');

	async function startEditShow(show: ShowRow) {
		editingShowId = show.id;
		efError = '';
		efOverlap = '';
		// Seed from a fresh fetch — never trust the (possibly stale) snapshot.
		let fresh = show;
		try {
			const res = await fetch('/api/shows');
			if (res.ok) {
				const list = (await res.json()) as ShowRow[];
				const match = list.find((s) => s.id === show.id);
				if (match) {
					fresh = match;
					Object.assign(show, match);
				}
			}
		} catch {
			// fall back to the current row
		}
		ef = {
			title: fresh.title,
			description: fresh.description ?? '',
			image: fresh.image ?? '',
			djId: fresh.dj_id,
			djHandle: fresh.dj_handle ?? '',
			dayOfWeek: String(fresh.day_of_week),
			startHours: String(Math.floor(fresh.start_minutes / 60)),
			startMinutes: String(fresh.start_minutes % 60),
			duration: String(fresh.duration_minutes),
			intervalWeeks: String(fresh.interval_weeks),
			cycleWeek: fresh.cycleWeek != null ? String(fresh.cycleWeek) : '',
			date: fresh.anchor_date ?? '',
			replay: ''
		};
	}

	async function saveEditShow(show: ShowRow) {
		efSaving = true;
		efError = '';
		efOverlap = '';
		const body: Record<string, unknown> = {
			title: ef.title,
			description: ef.description,
			image: ef.image,
			djId: ef.djId,
			djHandle: ef.djHandle
		};
		if (show.kind === 'event') {
			body.date = ef.date;
			body.startMinutes = Number(ef.startHours) * 60 + Number(ef.startMinutes);
			if (ef.replay.trim()) body.replayUrl = ef.replay;
		} else {
			body.dayOfWeek = Number(ef.dayOfWeek);
			body.startMinutes = Number(ef.startHours) * 60 + Number(ef.startMinutes);
			body.durationMinutes = Number(ef.duration);
			body.intervalWeeks = Number(ef.intervalWeeks);
			if (
				(show.interval_weeks === 2 || show.interval_weeks === 4) &&
				show.cycleWeek != null &&
				ef.cycleWeek &&
				Number(ef.cycleWeek) !== show.cycleWeek
			) {
				body.cycleWeek = Number(ef.cycleWeek);
			}
		}
		const res = await fetch(`/api/shows/${show.id}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		efSaving = false;
		if (!res.ok) {
			const err = (await res.json().catch(() => null)) as { error?: string } | null;
			efError = err?.error ?? `Save failed (${res.status})`;
			return;
		}
		const saved = (await res.json()) as { ok: boolean; overlap?: { id: string; title: string }[] };
		efOverlap = overlapText(saved.overlap);
		// Refresh the list from the DB (single source of truth).
		const showsRes = await fetch('/api/shows');
		if (showsRes.ok) {
			data.shows = (await showsRes.json()) as ShowRow[];
		}
		editingShowId = '';
		flashFeedback(showFeedback, show.id, 'Saved', true);
	}

	function overlapText(overlap: { id?: string; title: string }[] | undefined): string {
		if (!overlap || overlap.length === 0) return '';
		return overlap.map((o) => o.title).join(', ');
	}

	function flashFeedback(
		target: Record<string, RowFeedback>,
		key: string,
		text: string,
		ok: boolean
	) {
		target[key] = { text, ok };
		setTimeout(() => {
			if (target[key]?.text === text) delete target[key];
		}, 4000);
	}

	async function loadAdmin() {
		if (!isAdmin) return;
		const usersRes = await fetch('/api/admin/users');
		if (usersRes.ok) adminUsers = await usersRes.json();
		await loadChat();
		await loadFeatured();
	}

	async function loadChat() {
		const res = await fetch('/api/admin/chat');
		if (res.ok) {
			chatMessages = await res.json();
			chatLoaded = true;
		}
	}

	async function adminPost(id: string, action: string, value: unknown): Promise<boolean> {
		adminError = '';
		const res = await fetch(`/api/admin/${action === 'dj' ? 'shows' : 'users'}/${id}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action, value })
		});
		if (res.ok) return true;
		const body = (await res.json().catch(() => null)) as { error?: string } | null;
		adminError = body?.error ?? `Save failed (${res.status})`;
		return false;
	}

	async function setActive(u: AdminUser, active: boolean) {
		if (await adminPost(u.id, 'active', active)) {
			u.active = active ? 1 : 0;
			flashFeedback(userFeedback, u.id, 'Active updated', true);
		} else {
			flashFeedback(userFeedback, u.id, adminError, false);
		}
	}

	async function setRole(u: AdminUser, role: AdminUser['role']) {
		if (await adminPost(u.id, 'role', role)) {
			u.role = role;
			flashFeedback(userFeedback, u.id, 'Role saved', true);
		} else {
			flashFeedback(userFeedback, u.id, adminError, false);
		}
	}

	async function setShowDj(show: ShowRow, djId: string) {
		if (await adminPost(show.id, 'dj', djId)) {
			show.dj_id = djId;
			flashFeedback(showFeedback, show.id, 'DJ saved', true);
		} else {
			flashFeedback(showFeedback, show.id, adminError, false);
		}
	}

	async function deleteMessage(id: string) {
		const res = await fetch(`/api/admin/chat/messages/${id}`, { method: 'DELETE' });
		if (res.ok) chatMessages = chatMessages.filter((m) => m.id !== id);
	}

	async function purgeChatByName() {
		const name = purgeName.trim();
		if (!name) return;
		const res = await fetch('/api/admin/chat/purge', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (res.ok) {
			chatMessages = chatMessages.filter((m) => m.name !== name);
			purgeName = '';
		}
	}

	async function purgeChatByUser(userId: string) {
		const res = await fetch('/api/admin/chat/purge', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ userId })
		});
		if (res.ok) chatMessages = chatMessages.filter((m) => m.userId !== userId);
	}

	function fmtChatTime(ts: number) {
		return new Date(ts).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
	}

	onMount(() => {
		loadAdmin();
		// Fresh server data on every visit — the DB is the source of truth
		// (SPA navigation otherwise reuses the initial SSR snapshot).
		void invalidateAll();
	});

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
		showOverlap = '';
		if (!title.trim()) {
			error = 'Give your show a name.';
			return;
		}
		saving = true;
		const body: Record<string, unknown> = {
			title,
			description,
			image: showImage,
			dayOfWeek: Number(dayOfWeek),
			startMinutes: Number(startHours) * 60 + Number(startMinutes),
			durationMinutes: Number(duration),
			intervalWeeks: Number(intervalWeeks)
		};
		if ((Number(intervalWeeks) === 2 || Number(intervalWeeks) === 4) && cycleWeekSel) {
			body.cycleWeek = Number(cycleWeekSel);
		}
		const res = await fetch('/api/shows', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		saving = false;
		if (!res.ok) {
			error = 'Could not create the show.';
			return;
		}
		const created = (await res.json()) as { overlap?: { title: string }[] };
		showOverlap = overlapText(created.overlap);
		title = '';
		description = '';
		showImage = '';
		cycleWeekSel = '';
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

<div class="page">
<h1 class="h-lg">DJ Studio</h1>

<div class="tabs" role="tablist">
	<button class="tab" class:active={activeTab === 'shows'} onclick={() => (activeTab = 'shows')}>
		Shows
	</button>
	{#if isAdmin}
		<button class="tab" class:active={activeTab === 'create'} onclick={() => (activeTab = 'create')}>
			Create
		</button>
		<button
			class="tab"
			class:active={activeTab === 'add-episode'}
			onclick={() => (activeTab = 'add-episode')}
		>
			Add Episode
		</button>
		<button
			class="tab"
			class:active={activeTab === 'featured'}
			onclick={() => (activeTab = 'featured')}
		>
			Featured
		</button>
		<button class="tab" class:active={activeTab === 'users'} onclick={() => (activeTab = 'users')}>
			Users
		</button>
		<button class="tab" class:active={activeTab === 'show-djs'} onclick={() => (activeTab = 'show-djs')}>
			Show DJs
		</button>
		<button class="tab" class:active={activeTab === 'chat'} onclick={() => (activeTab = 'chat')}>
			Chat
		</button>
	{/if}
</div>

{#if activeTab === 'shows'}
	<section class="card">
		<h2>Your shows</h2>
		{#if shows.length === 0}
			<p class="muted">You don't have any shows yet. Create one below.</p>
		{:else}
			<ul class="show-list">
				{#each shows as show (show.id)}
					<li>
						<a href={`/shows/${show.id}`}>
							<strong>{show.title}</strong>
							<span class="meta mono">
								{DAYS[show.day_of_week]} · {fmtStart(show.start_minutes)}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

{#if isAdmin && activeTab === 'create'}
	<section class="card">
		<h2>Create</h2>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			if (createKind === 'event') createEvent();
			else createShow();
		}}
	>
		<div class="filter-btns create-toggle">
			<button
				class="filter-btn"
				class:active={createKind === 'show'}
				onclick={() => (createKind = 'show')}
			>
				Show
			</button>
			<button
				class="filter-btn"
				class:active={createKind === 'event'}
				onclick={() => (createKind = 'event')}
			>
				Event
			</button>
		</div>
		{#if createKind === 'show'}
			<Field label="Show name">
				<Text bind:value={title} placeholder="e.g. The Lunchtime Hour" css="vr-input" />
			</Field>
			<Field label="Description">
				<Text bind:value={description} placeholder="Short blurb (optional)" css="vr-input" />
			</Field>
			<Field label="Image URL (optional)">
				<Text bind:value={showImage} placeholder="https://…" css="vr-input" />
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
				{#if Number(intervalWeeks) === 2 || Number(intervalWeeks) === 4}
					<Field label="Cycle week">
						<select class="dj-select" bind:value={cycleWeekSel}>
							<option value="">Auto</option>
							{#if Number(intervalWeeks) === 4}
								<option value="1">Week 1</option>
								<option value="2">Week 2</option>
								<option value="3">Week 3</option>
								<option value="4">Week 4</option>
							{:else}
								<option value="1">Weeks 1 &amp; 3</option>
								<option value="2">Weeks 2 &amp; 4</option>
							{/if}
						</select>
					</Field>
				{/if}
			</div>
			{#if error}
				<div class="notice bad">{error}</div>
			{/if}
			{#if notice}
				<div class="notice ok">{notice}</div>
			{/if}
			{#if showOverlap}
				<div class="notice warn">⚠ Overlaps with: {showOverlap}</div>
			{/if}
			<Button css="vr-cta" type="primary" disabled={saving} onclick={createShow}>
				{saving ? 'Creating…' : 'Create show'}
			</Button>
		{:else}
			<Field label="Event name">
				<Text bind:value={evTitle} placeholder="e.g. HIFI SESSION" css="vr-input" />
			</Field>
			<Field label="Description (optional)">
				<Text bind:value={evDescription} placeholder="Short blurb" css="vr-input" />
			</Field>
			<Field label="Date">
				<Text bind:value={evDate} placeholder="YYYY-MM-DD" css="vr-input" />
			</Field>
			<div class="row">
				<Field label="Start hour (24h)">
					<Text bind:value={evStartHours} placeholder="18" css="vr-input" />
				</Field>
				<Field label="Minute">
					<Text bind:value={evStartMinutes} placeholder="0" css="vr-input" />
				</Field>
			</div>
			<Field label="Replay link (optional)">
				<Text
					bind:value={evReplay}
					placeholder="Track id or on-demand URL"
					css="vr-input"
				/>
			</Field>
			<Field label="Image URL (optional)">
				<Text bind:value={evImage} placeholder="https://…" css="vr-input" />
			</Field>
			{#if evError}
				<div class="notice bad">{evError}</div>
			{/if}
			{#if evNotice}
				<div class="notice ok">{evNotice}</div>
			{/if}
			{#if evOverlap}
				<div class="notice warn">⚠ Overlaps with: {evOverlap}</div>
			{/if}
			<Button css="vr-cta" type="primary" disabled={evSaving} onclick={createEvent}>
				{evSaving ? 'Creating…' : 'Create event'}
			</Button>
		{/if}
	</form>
</section>
{/if}

{#if isAdmin && activeTab === 'add-episode'}
	<section class="card">
		<h2>Add an episode</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				addEpisode();
			}}
		>
			<Field label="Show">
				<select class="dj-select" bind:value={epShowId}>
					{#each shows as show (show.id)}
						<option value={show.id}>{show.title}</option>
					{/each}
				</select>
			</Field>
			<Field label="Date">
				<Text bind:value={epDate} placeholder="YYYY-MM-DD" css="vr-input" />
			</Field>
			<div class="row">
				<Field label="Start hour (24h)">
					<Text bind:value={epStartHours} placeholder="18" css="vr-input" />
				</Field>
				<Field label="Minute">
					<Text bind:value={epStartMinutes} placeholder="0" css="vr-input" />
				</Field>
				<Field label="Duration (min)">
					<Text bind:value={epDuration} placeholder="60" css="vr-input" />
				</Field>
			</div>
			<Field label="Replay link (optional)">
				<Text
					bind:value={epReplay}
					placeholder="Track id or on-demand URL"
					css="vr-input"
				/>
			</Field>
			{#if epError}
				<div class="notice bad">{epError}</div>
			{/if}
			{#if epNotice}
				<div class="notice ok">{epNotice}</div>
			{/if}
			{#if epOverlap}
				<div class="notice warn">⚠ Overlaps with: {epOverlap}</div>
			{/if}
			<Button css="vr-cta" type="primary" disabled={epSaving} onclick={addEpisode}>
				{epSaving ? 'Adding…' : 'Add episode'}
			</Button>
		</form>
	</section>
{/if}

{#if isAdmin && activeTab === 'featured'}
	<section class="card">
		<h2>Admin — featured shows</h2>
		{#if !featuredLoaded}
			<p class="muted">Loading episodes…</p>
		{:else if featuredList.length === 0}
			<p class="muted">No episodes with replay links yet.</p>
		{:else}
			<p class="muted">
				{featuredList.filter((c) => c.featured === 1).length} of 3 featured — toggle episodes with
				replay links below.
			</p>
			{#if featuredFeedback}
				<div class="notice bad">{featuredFeedback}</div>
			{/if}
			<div class="admin-table">
				{#each featuredList as c (c.id)}
					<div class="admin-row">
						<div class="user-main">
							<strong>{c.title}</strong>
							<span class="meta">{c.date}</span>
						</div>
						<button class="mini-btn" class:off={c.featured === 0} onclick={() => toggleFeatured(c)}>
							{c.featured === 1 ? 'Unfeature' : 'Feature'}
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}

{#if isAdmin && activeTab === 'users'}
	<section class="card">
		<h2>Admin — users</h2>		{#if adminUsers.length === 0}
			<p class="muted">Loading users…</p>
		{:else}
			<div class="user-filters">
				<div class="filter-btns">
					<button
						class="filter-btn"
						class:active={userRoleFilter === 'all'}
						onclick={() => (userRoleFilter = 'all')}
					>
						All
					</button>
					<button
						class="filter-btn"
						class:active={userRoleFilter === 'listener'}
						onclick={() => (userRoleFilter = 'listener')}
					>
						Listener
					</button>
					<button
						class="filter-btn"
						class:active={userRoleFilter === 'dj'}
						onclick={() => (userRoleFilter = 'dj')}
					>
						DJ
					</button>
					<button
						class="filter-btn"
						class:active={userRoleFilter === 'admin'}
						onclick={() => (userRoleFilter = 'admin')}
					>
						Admin
					</button>
				</div>
				<div class="user-search">
					<Text bind:value={userSearch} placeholder="Filter by name or email…" css="vr-input" />
				</div>
				<label class="sort-label" title="Sort">
					<span class="meta">Sort</span>
					<select bind:value={userSort}>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
						<option value="name">Name A–Z</option>
					</select>
				</label>
			</div>
			{#if filteredUsers.length === 0}
				<p class="muted">No users match.</p>
			{:else}
				<div class="admin-table">
					{#each filteredUsers as u (u.id)}
						<div class="admin-row">
							<div class="user-main">
								<strong>{u.name || u.email}</strong>
								<span class="meta">{u.email}</span>
							</div>
							<label class="role-label" title="Role">
								<span class="meta">Role</span>
								<select
									value={u.role}
									onchange={(e) => setRole(u, e.currentTarget.value as AdminUser['role'])}
								>
									<option value="listener">Listener</option>
									<option value="dj">DJ</option>
									<option value="admin">Admin</option>
								</select>
							</label>
							{#if userFeedback[u.id]}
								<span class="row-feedback" class:bad={!userFeedback[u.id].ok}>
									{userFeedback[u.id].text}
								</span>
							{/if}
							<button
								class="mini-btn"
								class:off={u.active === 0}
								onclick={() => setActive(u, u.active === 0)}
							>
								{u.active ? 'Deactivate' : 'Activate'}
							</button>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</section>
{/if}

{#if isAdmin && activeTab === 'show-djs'}
	<section class="card">
		<h2>Admin — show DJs</h2>
		{#if shows.length === 0}
			<p class="muted">No shows yet.</p>
		{:else if adminUsers.length === 0}
			<p class="muted">Loading users…</p>
		{:else}
			<div class="admin-table">
				{#each shows as show (show.id)}
					<div class="admin-row">
						<div class="user-main">
							<strong>{show.title}</strong>
							<span class="meta">
								{#if show.kind === 'event'}
									Event
								{:else}
									{DAYS[show.day_of_week]} · {fmtStart(show.start_minutes)}
								{/if}
							</span>
						</div>
						<label class="role-label" title="DJ">
							<span class="meta">DJ</span>
							<select
								value={show.dj_id}
								onchange={(e) => setShowDj(show, e.currentTarget.value)}
							>
								{#if !djUsers.some((d) => d.id === show.dj_id)}
									<option value={show.dj_id} disabled>Unknown DJ</option>
								{/if}
								{#each djUsers as dj (dj.id)}
									<option value={dj.id}>{dj.name || dj.email}</option>
								{/each}
							</select>
						</label>
						{#if showFeedback[show.id]}
							<span class="row-feedback" class:bad={!showFeedback[show.id].ok}>
								{showFeedback[show.id].text}
							</span>
						{/if}
						<button class="mini-btn" onclick={() => startEditShow(show)}>Edit</button>
					</div>
					{#if editingShowId === show.id}
						<form
							class="show-edit"
							onsubmit={(e) => {
								e.preventDefault();
								saveEditShow(show);
							}}
						>
							<Field label="Title">
								<Text bind:value={ef.title} css="vr-input" />
							</Field>
							<Field label="Description">
								<Text bind:value={ef.description} css="vr-input" />
							</Field>
							<Field label="Image URL (blank clears)">
								<Text bind:value={ef.image} placeholder="https://…" css="vr-input" />
							</Field>
							<Field label="DJ name">
								<Text bind:value={ef.djHandle} css="vr-input" />
							</Field>
							<Field label="DJ">
								<select class="dj-select" bind:value={ef.djId}>
									{#if !djUsers.some((d) => d.id === ef.djId)}
										<option value={ef.djId} disabled>Unknown DJ</option>
									{/if}
									{#each djUsers as dj (dj.id)}
										<option value={dj.id}>{dj.name || dj.email}</option>
									{/each}
								</select>
							</Field>
							{#if show.kind === 'event'}
								<Field label="Date">
									<Text bind:value={ef.date} placeholder="YYYY-MM-DD" css="vr-input" />
								</Field>
								<div class="row">
									<Field label="Start hour (24h)">
										<Text bind:value={ef.startHours} css="vr-input" />
									</Field>
									<Field label="Minute">
										<Text bind:value={ef.startMinutes} css="vr-input" />
									</Field>
								</div>
								<Field label="Replay link (blank keeps current)">
									<Text bind:value={ef.replay} placeholder="Track id or on-demand URL" css="vr-input" />
								</Field>
							{:else}
								<div class="row">
									<Field label="Day">
										<Combo
											placeholder="Day"
											options={DAYS.map((d, i) => ({ id: String(i), label: d }))}
											bind:value={ef.dayOfWeek}
										/>
									</Field>
									<Field label="Start hour (24h)">
										<Text bind:value={ef.startHours} css="vr-input" />
									</Field>
									<Field label="Minute">
										<Text bind:value={ef.startMinutes} css="vr-input" />
									</Field>
									<Field label="Duration (min)">
										<Text bind:value={ef.duration} css="vr-input" />
									</Field>
									<Field label="Repeats">
										<Combo placeholder="Repeat" options={REPEATS} bind:value={ef.intervalWeeks} />
									</Field>
									{#if show.interval_weeks === 2 || show.interval_weeks === 4}
										<Field label="Cycle week">
											<select class="dj-select" bind:value={ef.cycleWeek}>
												{#if show.interval_weeks === 4}
													<option value="1">Week 1</option>
													<option value="2">Week 2</option>
													<option value="3">Week 3</option>
													<option value="4">Week 4</option>
												{:else}
													<option value="1">Weeks 1 &amp; 3</option>
													<option value="2">Weeks 2 &amp; 4</option>
												{/if}
											</select>
										</Field>
									{/if}
								</div>
							{/if}
							{#if efError}
								<div class="notice bad">{efError}</div>
							{/if}
							{#if efOverlap}
								<div class="notice warn">⚠ Overlaps with: {efOverlap}</div>
							{/if}
							<div class="edit-actions">
								<Button css="vr-cta" type="primary" disabled={efSaving} onclick={() => saveEditShow(show)}>
									{efSaving ? 'Saving…' : 'Save'}
								</Button>
								<Button css="vr-cta ghost" onclick={() => (editingShowId = '')}>Cancel</Button>
							</div>
						</form>
					{/if}
				{/each}
			</div>
		{/if}
	</section>
{/if}

{#if isAdmin && activeTab === 'chat'}
	<section class="card">
		<h2>Admin — chat moderation</h2>
		<form class="purge-row" onsubmit={(e) => { e.preventDefault(); purgeChatByName(); }}>
			<Text bind:value={purgeName} placeholder="Name to purge (e.g. Troublemaker)" css="vr-input" />
			<Button css="vr-cta ghost" onclick={purgeChatByName}>Purge by name</Button>
		</form>
		{#if !chatLoaded}
			<p class="muted">Loading recent messages…</p>
		{:else if chatMessages.length === 0}
			<p class="muted">No messages yet.</p>
		{:else}
			<div class="admin-table chat-list">
				{#each chatMessages as m (m.id)}
					<div class="admin-row">
						<div class="user-main">
							<span class="chat-line">
								<strong>{m.name}</strong> <em class="chat-time">{fmtChatTime(m.ts)}</em>
								{#if m.userId}
									<em class="chat-time">· {emailById.get(m.userId) ?? 'account'}</em>
								{/if}
							</span>
							<span class="chat-content">{m.content}</span>
						</div>
						<div class="chat-actions">
							{#if m.userId}
								<button
									class="mini-btn danger"
									onclick={() => purgeChatByUser(m.userId!)}
								>
									Purge user
								</button>
							{/if}
							<button class="mini-btn danger" onclick={() => deleteMessage(m.id)}>Delete</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 60rem;
	}

	.page > h1 {
		margin: 0 0 1.5rem;
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.tab {
		background: none;
		border: 1px solid var(--vr-line);
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.4rem 0.9rem;
		cursor: pointer;
	}

	.tab:hover {
		color: var(--vr-text);
		border-color: var(--vr-text);
	}

	.tab.active {
		background: var(--vr-text);
		color: var(--vr-black);
		border-color: var(--vr-text);
	}

	.card {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
		padding: 1.25rem 1.5rem;
		margin-bottom: 1.5rem;
	}

	.card h2 {
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin: 0 0 1rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 0.6rem;
	}

	.show-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.show-list li {
		border-bottom: 1px solid var(--vr-line-muted);
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
		color: var(--vr-green);
	}

	.meta {
		color: var(--vr-muted);
		font-size: 0.85rem;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.notice {
		margin: 0.5rem 0 1rem;
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

	.notice.warn {
		color: var(--vr-text);
		background: var(--vr-surface-low);
	}

	.muted {
		color: var(--vr-muted);
	}

	.admin-table {
		display: flex;
		flex-direction: column;
	}

	.admin-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--vr-line-muted);
		justify-content: space-between;
	}

	.admin-row:last-child {
		border-bottom: none;
	}

	.user-main {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.role-label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-right: auto;
	}

	.role-label select {
		background: var(--vr-surface-low);
		color: var(--vr-text);
		border: 1px solid var(--vr-line);
		padding: 0.25rem 0.4rem;
	}

	.row-feedback {
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vr-green);
		white-space: nowrap;
	}

	.row-feedback.bad {
		color: var(--vr-red);
	}

	.user-filters {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.filter-btns {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.create-toggle {
		margin-bottom: 1rem;
	}

	.filter-btn {
		background: none;
		border: 1px solid var(--vr-line);
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.35rem 0.7rem;
		cursor: pointer;
	}

	.filter-btn:hover {
		color: var(--vr-text);
		border-color: var(--vr-text);
	}

	.filter-btn.active {
		background: var(--vr-text);
		color: var(--vr-black);
		border-color: var(--vr-text);
	}

	.user-search {
		flex: 1 1 12rem;
		min-width: 0;
	}

	.sort-label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.sort-label select {
		background: var(--vr-surface-low);
		color: var(--vr-text);
		border: 1px solid var(--vr-line);
		padding: 0.25rem 0.4rem;
	}

	.dj-select {
		background: var(--vr-surface-low);
		color: var(--vr-text);
		border: 1px solid var(--vr-line);
		padding: 0.4rem 0.5rem;
		width: 100%;
		max-width: 24rem;
	}

	.show-edit {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		border-top: 1px solid var(--vr-line);
		margin-top: 0.5rem;
		padding: 1rem 0 0.5rem;
	}

	.edit-actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.25rem;
	}

	.mini-btn {
		border: 1px solid var(--vr-line-muted);
		background: transparent;
		color: var(--vr-text);
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.35rem 0.7rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.mini-btn:hover {
		background: var(--vr-text);
		color: var(--vr-black);
		border-color: var(--vr-line);
	}

	.mini-btn.off {
		color: var(--vr-faint);
	}

	.mini-btn.danger {
		color: var(--vr-red);
	}

	.mini-btn.danger:hover {
		background: var(--vr-red);
		color: #000;
		border-color: var(--vr-red);
	}

	.chat-line {
		display: inline-flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.chat-time {
		color: var(--vr-muted);
		font-style: normal;
		font-size: 0.75rem;
	}

	.chat-content {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 32rem;
		color: var(--vr-text);
		font-size: 0.9rem;
	}

	.chat-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.purge-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.admin-row {
			flex-wrap: wrap;
		}

		.role-label {
			margin-right: 0;
			width: 100%;
		}

		.chat-content {
			max-width: 100%;
		}
	}
</style>
