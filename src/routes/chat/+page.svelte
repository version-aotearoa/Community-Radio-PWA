<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button, Text } from '@svar-ui/svelte-core';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();

	interface ChatMessage {
		id: string;
		ts: number;
		name: string;
		content: string;
		userId?: string | null;
		reactions?: Record<string, number>;
		my?: string[];
	}

	function getPid(): string {
		try {
			let pid = localStorage.getItem('vr-chat-pid');
			if (!pid) {
				pid = crypto.randomUUID();
				localStorage.setItem('vr-chat-pid', pid);
			}
			return pid;
		} catch {
			return 'anon';
		}
	}

	const myHearts = new Set<string>();

	function heartCount(msg: ChatMessage): number {
		return msg.reactions?.heart ?? 0;
	}

	function heartActive(msg: ChatMessage): boolean {
		return myHearts.has(msg.id);
	}

	function toggleHeart(msg: ChatMessage) {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		if (myHearts.has(msg.id)) {
			myHearts.delete(msg.id);
		} else {
			myHearts.add(msg.id);
		}
		msg.reactions = { ...(msg.reactions ?? {}), heart: Math.max(0, heartCount(msg) + (heartActive(msg) ? 1 : -1)) };
		ws.send(JSON.stringify({ type: 'react', id: msg.id, emoji: 'heart' }));
	}

	let ws = $state<WebSocket | null>(null);
	let messages = $state<ChatMessage[]>([]);
	let input = $state('');
	let connected = $state(false);
	let error = $state('');
	let closed = $state(false);
	let turnstileToken = $state('');
	let scrollEl: HTMLDivElement | undefined = $state();
	let identity = $state<{ token: string; name: string } | null>(null);
	// Session-level cache: skip the identity fetch on reconnects within 4min.
	let identityCache:
		| { token: string; name: string; exp: number }
		| null = null;
	// Custom handle chosen by an anonymous user (only persisted when they set it).
	let handle = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem('vr-chat-handle') ?? '') : '');
	let handleInput = $state('');
	// Name assigned by the worker for this session (Listener N or account name).
	let assignedName = $state('');
	const user = $derived(data.user);
	const displayName = $derived(user ? user.name || user.email || 'Listener' : assignedName || handle || 'Listener');

	$effect(() => {
		if (scrollEl && messages.length) {
			scrollEl.scrollTop = scrollEl.scrollHeight;
		}
	});

	$effect(() => {
		// Connect once a Turnstile token is available.
		if (turnstileToken && !ws && !closed && data.chatUrl) {
			connect();
		}
	});

	function onTurnstileToken(token: string) {
		turnstileToken = token;
		error = '';
	}

	function onTurnstileExpire() {
		turnstileToken = '';
		ws?.close();
	}

	async function connect() {
		let name = '';
		if (user) {
			const cached = identityCache;
			if (cached && cached.exp * 1000 - Date.now() > 240_000) {
				identity = { token: cached.token, name: cached.name };
			} else {
				try {
					const res = await fetch('/api/chat/identity');
					if (res.ok) {
						const fresh = (await res.json()) as { token: string; name: string };
						identity = fresh;
						const payload = fresh.token.split('.')[0];
						const exp = Number(JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).exp);
						identityCache = { token: fresh.token, name: fresh.name, exp: Number.isFinite(exp) ? exp : 0 };
					}
				} catch {
					identity = null;
				}
			}
		}
		const params = new URLSearchParams({
			room: 'main',
			turnstile: turnstileToken,
			pid: getPid()
		});
		if (identity || user) {
			params.set('name', displayName);
		} else if (handle) {
			params.set('name', handle);
		} else if (assignedName) {
			params.set('name', assignedName);
		} else {
			params.set('anonymous', '1');
		}
		if (identity) params.set('token', identity.token);
		const base = data.chatUrl.replace(/^http/, 'ws');
		const url = `${base}/api/chat/ws?${params.toString()}`;
		const socket = new WebSocket(url);

		socket.onopen = () => {
			connected = true;
			error = '';
		};
		socket.onclose = () => {
			connected = false;
			ws = null;
			if (!closed && turnstileToken) setTimeout(connect, 2000);
		};
		socket.onerror = () => socket.close();
		socket.onmessage = (e: MessageEvent) => {
			let frame: {
				type?: string;
				messages?: ChatMessage[];
				message?: ChatMessage | string;
				id?: string;
				name?: string;
				userId?: string | null;
				emoji?: string;
				count?: number;
			};
			try {
				frame = JSON.parse(String(e.data));
			} catch {
				return;
			}
			if (frame.type === 'history' && frame.messages) {
				messages = frame.messages;
				myHearts.clear();
				for (const m of frame.messages) {
					if (m.my?.includes('heart')) myHearts.add(m.id);
				}
			} else if (frame.type === 'reacted' && frame.id) {
				const msg = messages.find((m) => m.id === frame.id);
				if (msg) {
					msg.reactions = { ...(msg.reactions ?? {}), heart: frame.count ?? 0 };
				}
			} else if (frame.type === 'name' && frame.name) {
				assignedName = frame.name;
				if (!handle) handleInput = frame.name;
			} else if (frame.type === 'message' && frame.message) {
				messages = [...messages, frame.message as ChatMessage].slice(-300);
			} else if (frame.type === 'deleted' && frame.id) {
				messages = messages.filter((m) => m.id !== frame.id);
			} else if (frame.type === 'purged' && frame.name) {
				messages = messages.filter((m) => m.name !== frame.name);
			} else if (frame.type === 'error') {
				error = String(frame.message ?? '');
			}
		};

		ws = socket;
	}

	onMount(() => {
		if (!data.siteKey) {
			// No Turnstile configured — connect directly.
			turnstileToken = 'unverified';
			connect();
		}
	});
	onDestroy(() => {
		closed = true;
		ws?.close();
	});

	function send() {
		const content = input.trim();
		if (!content || !ws || ws.readyState !== WebSocket.OPEN) return;
		ws.send(JSON.stringify({ type: 'message', content }));
		input = '';
	}

	function saveHandle() {
		const value = handleInput.trim().slice(0, 40);
		if (!value) return;
		handle = value;
		assignedName = '';
		try {
			localStorage.setItem('vr-chat-handle', value);
		} catch {
			// storage unavailable; handle still applies for this session
		}
		ws?.close();
	}
</script>

<svelte:head>
	<title>Chat — Version Radio</title>
</svelte:head>

<Seo />

<div class="page">
	{#if !data.chatUrl}
		<div class="notice bad">Chat isn't configured yet (missing PUBLIC_CHAT_URL).</div>
	{:else}
		{#if data.siteKey && !connected}
			<div class="verify-box">
				<p class="verify-text">Verify you're human to join the chat.</p>
				<Turnstile
					siteKey={data.siteKey}
					action="chat"
					onToken={onTurnstileToken}
					onExpire={onTurnstileExpire}
				/>
			</div>
		{/if}
		<div class="chat-card">
			<div class="chat-head mono">
				<span class="status" class:online={connected}></span>
				<span>{connected ? 'Connected' : 'Reconnecting…'}</span>
			</div>
			<div class="messages" bind:this={scrollEl}>
				{#if messages.length === 0}
					<p class="empty">No messages yet. Say hello!</p>
				{/if}
				{#each messages as msg (msg.id)}
					<div class="msg" class:mine={msg.name === displayName}>
						<div class="msg-meta">
							<span class="msg-name">{msg.name}</span>
							<span class="msg-time">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
							<button
								class="heart-btn"
								class:active={heartActive(msg)}
								onclick={() => toggleHeart(msg)}
								title={heartActive(msg) ? 'Remove heart' : 'Heart this'}
								aria-label={heartActive(msg) ? 'Remove heart' : 'Heart this'}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path
										d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
										fill={heartActive(msg) ? 'currentColor' : 'none'}
										stroke="currentColor"
										stroke-width="1.8"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								{#if heartCount(msg) > 0}<span>{heartCount(msg)}</span>{/if}
							</button>
						</div>
						<p class="msg-body">{msg.content}</p>
					</div>
				{/each}
			</div>
			<form
				class="composer"
				onsubmit={(e) => {
					e.preventDefault();
					send();
				}}
			>
				<Text bind:value={input} placeholder="Say something…" css="vr-input chat-input" />
				<button class="send" type="submit" disabled={!connected}>Send</button>
			</form>
			{#if error}
				<div class="notice bad">{error}</div>
			{/if}
		</div>
	{/if}

	<p class="subtitle mono">
		You're chatting as <strong>{displayName}</strong>
		{#if user}
			(signed in)
		{:else if !handle}
			· <a href="/login">sign in</a>
		{/if}
	</p>

	{#if !user}
		<form class="handle-row" onsubmit={(e) => { e.preventDefault(); saveHandle(); }}>
			<Text bind:value={handleInput} placeholder="Pick a handle (optional)" css="vr-input" />
			<Button css="vr-cta ghost" onclick={saveHandle}>update</Button>
		</form>
	{/if}
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 50rem;
	}

	.subtitle {
		color: var(--vr-muted);
		margin: 1.5rem 0 0;
	}

	.subtitle strong {
		color: var(--vr-text);
	}

	.subtitle a {
		color: var(--vr-text);
		text-decoration: underline;
	}

	.handle-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0.75rem 0 0;
	}

	.handle-row :global(button) {
		overflow: visible;
		text-overflow: clip;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.handle-row :global(input) {
		min-width: 0;
		flex: 1 1 10rem;
	}

	.chat-card {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
	}

	.chat-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--vr-line);
		color: var(--vr-muted);
	}

	.status {
		width: 8px;
		height: 8px;
		background: var(--vr-line-muted);
	}

	.status.online {
		background: var(--vr-green);
		animation: status-pulse 1.6s ease-in-out infinite;
	}

	@keyframes status-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}

	.messages {
		height: 60vh;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.empty {
		color: var(--vr-muted);
		text-align: center;
		margin: auto;
	}

	.msg {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		background: var(--vr-surface-low);
		border: 1px solid var(--vr-line-muted);
		padding: 0.5rem 0.8rem;
		max-width: 88%;
	}

	.msg.mine {
		align-self: flex-end;
		border-color: var(--vr-line);
		background: var(--vr-surface-high);
	}

	.msg-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.msg-name {
		color: var(--vr-text);
		font-weight: 600;
		font-size: 0.85rem;
		font-family: var(--vr-font-mono);
		white-space: nowrap;
		min-width: 0;
		text-overflow: ellipsis;
	}

	.msg-time {
		margin-left: auto;
		color: var(--vr-faint);
		font-size: 0.7rem;
		white-space: nowrap;
		flex-shrink: 0;
	}

	@media (max-width: 640px) {
		.msg {
			max-width: 100%;
			padding: 0.45rem 0.65rem;
			gap: 0.25rem;
		}

		.msg-name {
			flex: 1 1 auto;
			font-size: 0.8rem;
		}

		.msg-body {
			font-size: 0.95rem;
		}
	}

	.msg-body {
		word-break: break-word;
		margin: 0;
	}

	.heart-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: none;
		border: none;
		color: var(--vr-faint);
		font-size: 0.72rem;
		cursor: pointer;
		padding: 0.1rem 0.15rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.heart-btn svg {
		width: 14px;
		height: 14px;
	}

	.heart-btn span {
		font-variant-numeric: tabular-nums;
	}

	.heart-btn:hover,
	.heart-btn.active {
		color: var(--vr-red);
	}

	.composer {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--vr-line);
	}

	:global(.chat-input) {
		flex: 1;
	}

	.send {
		background: #fff;
		border: 1px solid #fff;
		color: #000;
		font-family: var(--vr-font-headline);
		font-size: 1rem;
		text-transform: uppercase;
		padding: 0 1.25rem;
		cursor: pointer;
	}

	.send:hover {
		background: #000;
		color: #fff;
	}

	.send:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.notice {
		margin: 0.75rem 0;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--vr-line);
		font-size: 0.9rem;
	}

	.notice.bad {
		color: var(--vr-text);
	}

	.verify-box {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.verify-text {
		margin: 0 0 0.5rem;
		color: var(--vr-muted);
		font-size: 0.9rem;
	}
</style>
