<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Text } from '@svar-ui/svelte-core';
	import Turnstile from '$lib/components/Turnstile.svelte';

	let { data } = $props();

	interface ChatMessage {
		id: string;
		ts: number;
		name: string;
		content: string;
	}

	let ws = $state<WebSocket | null>(null);
	let messages = $state<ChatMessage[]>([]);
	let input = $state('');
	let connected = $state(false);
	let error = $state('');
	let closed = $state(false);
	let turnstileToken = $state('');
	let scrollEl: HTMLDivElement | undefined = $state();

	const user = $derived(data.user);
	const displayName = $derived(user ? user.name || user.email || 'Listener' : 'Listener');

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

	function connect() {
		const base = data.chatUrl.replace(/^http/, 'ws');
		const url = `${base}/api/chat/ws?room=main&name=${encodeURIComponent(displayName)}&turnstile=${encodeURIComponent(turnstileToken)}`;
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
			let frame: { type?: string; messages?: ChatMessage[]; message?: ChatMessage | string };
			try {
				frame = JSON.parse(String(e.data));
			} catch {
				return;
			}
			if (frame.type === 'history' && frame.messages) {
				messages = frame.messages;
			} else if (frame.type === 'message' && frame.message) {
				messages = [...messages, frame.message as ChatMessage].slice(-300);
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
</script>

<svelte:head>
	<title>Chat — Version Radio</title>
</svelte:head>

<h1 class="page-title">Community Chat</h1>
<p class="subtitle">
	You're chatting as <strong>{displayName}</strong>
	{#if user}
		(signed in)
	{:else}
		— <a href="/login">sign in</a> to use your name
	{/if}
</p>

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
		<div class="chat-head">
			<span class="status" class:online={connected}></span>
			<span>{connected ? 'Connected' : 'Reconnecting…'}</span>
		</div>
		<div class="messages" bind:this={scrollEl}>
			{#if messages.length === 0}
				<p class="empty">No messages yet. Say hello!</p>
			{/if}
			{#each messages as msg (msg.id)}
				<div class="msg" class:mine={msg.name === displayName}>
					<span class="msg-name">{msg.name}</span>
					<span class="msg-body">{msg.content}</span>
					<span class="msg-time">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

<style>
	.page-title {
		font-size: 1.6rem;
		margin: 0 0 0.25rem;
	}

	.subtitle {
		color: var(--vr-muted);
		margin: 0 0 1.25rem;
	}

	.subtitle a {
		color: var(--vr-accent-strong);
	}

	.chat-card {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		overflow: hidden;
	}

	.chat-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--vr-border);
		font-size: 0.85rem;
		color: var(--vr-muted);
	}

	.status {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--vr-live);
	}

	.status.online {
		background: #22c55e;
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
		align-items: baseline;
		gap: 0.5rem;
		background: var(--vr-surface-raised);
		border: 1px solid var(--vr-border);
		border-radius: 10px;
		padding: 0.45rem 0.7rem;
		max-width: 82%;
	}

	.msg.mine {
		align-self: flex-end;
		border-color: var(--vr-accent);
	}

	.msg-name {
		color: var(--vr-accent-strong);
		font-weight: 600;
		font-size: 0.85rem;
		white-space: nowrap;
	}

	.msg-body {
		word-break: break-word;
	}

	.msg-time {
		margin-left: auto;
		color: var(--vr-muted);
		font-size: 0.7rem;
		white-space: nowrap;
	}

	.composer {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--vr-border);
	}

	:global(.chat-input) {
		flex: 1;
	}
	.send {
		background: var(--vr-accent);
		border: none;
		color: #0b0b11;
		font-weight: 600;
		padding: 0 1rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.notice {
		margin: 0.75rem 1rem;
		padding: 0.6rem 0.85rem;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.notice.bad {
		background: rgba(255, 77, 109, 0.12);
		border: 1px solid rgba(255, 77, 109, 0.4);
		color: #ffb3c1;
	}

	.verify-box {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
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
