<script lang="ts">
	import { onMount } from 'svelte';
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
	let adminError = $state('');

	interface RowFeedback {
		text: string;
		ok: boolean;
	}

	let userFeedback = $state<Record<string, RowFeedback>>({});
	let showFeedback = $state<Record<string, RowFeedback>>({});

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

	onMount(loadAdmin);

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

<div class="page">
<h1 class="h-lg">DJ Studio</h1>

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
						<span class="meta mono">
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

{#if isAdmin}
	<section class="card">
		<h2>Admin — users</h2>
		{#if adminUsers.length === 0}
			<p class="muted">Loading users…</p>
		{:else}
			<div class="admin-table">
				{#each adminUsers as u (u.id)}
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
	</section>

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
								{DAYS[show.day_of_week]} · {fmtStart(show.start_minutes)}
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
					</div>
				{/each}
			</div>
		{/if}
	</section>

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
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr;
		gap: 0.75rem;
	}

	@media (max-width: 640px) {
		.row {
			grid-template-columns: 1fr;
		}
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
