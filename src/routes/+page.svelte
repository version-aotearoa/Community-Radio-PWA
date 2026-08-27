<script lang="ts">
	import { Button } from '@svar-ui/svelte-core';
	import { onMount } from 'svelte';
	import { requestPlay, requestTogglePlay, streamPlaying } from '$lib/stores/player';
	import { live, startLivePolling } from '$lib/stores/live';

	const livePayload = $derived($live);
	const isPlaying = $derived($streamPlaying);

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	onMount(() => startLivePolling());
</script>

<svelte:head>
	<title>Version Radio — independent radio</title>
</svelte:head>

<section class="hero">
	<p class="eyebrow">Independent radio · Auckland, NZ</p>
	<h1>
		Sounds for
		<span class="accent">the between times.</span>
	</h1>
	<p class="lede">
		Version Radio is 24/7 independent radio. Tune in live, browse the schedule, and join the
		community chat while DJs run the show.
	</p>
	<div class="actions">
		<Button css="vr-cta" onclick={requestPlay}>Play live stream</Button>
		<a class="ghost-link" href="/schedule">View schedule</a>
	</div>
</section>

<section class="card listen-card">
	<div class="listen">
		<div class="listen-art">
			{#if livePayload?.nowPlaying?.art}
				<img src={livePayload.nowPlaying.art} alt="" width="96" height="96" loading="lazy" />
			{:else if livePayload?.onAir?.djImage}
				<img src={livePayload.onAir.djImage} alt="" width="96" height="96" loading="lazy" />
			{:else}
				<div class="art-fallback">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
				</div>
			{/if}
		</div>
		<div class="listen-copy">
			<h2>
				On air now
				{#if livePayload}
					{#if livePayload.live.isLive}
						<em class="badge live">Live{livePayload.live.streamerName ? ` · ${livePayload.live.streamerName}` : ''}</em>
					{:else}
						<em class="badge replay">Replay</em>
					{/if}
				{/if}
			</h2>
			{#if livePayload?.nowPlaying?.title}
				<p class="track">
					<strong>{livePayload.nowPlaying.title}</strong>
					{#if livePayload.nowPlaying.artist} — {livePayload.nowPlaying.artist}{/if}
				</p>
			{:else}
				<p class="muted">Hit play and take Version Radio with you — the player stays pinned to the bottom of the screen while you browse.</p>
			{/if}
			{#if livePayload?.trackShow}
				<a class="showlink" href={`/shows/${livePayload.trackShow.id}`}>On air: {livePayload.trackShow.title} →</a>
			{:else if livePayload?.onAir}
				<a class="showlink" href={`/shows/${livePayload.onAir.id}`}>On air: {livePayload.onAir.title} →</a>
			{:else if livePayload?.next}
				<span class="muted">
					Up next: {livePayload.next.title} · {fmtTime(livePayload.next.startMinutes)}
				</span>
			{/if}
		</div>
		<button class="big-play" onclick={requestTogglePlay} aria-label={isPlaying ? 'Pause live stream' : 'Play live stream'}>
			{#if isPlaying}
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" />
				</svg>
			{/if}
		</button>
	</div>
</section>

<section class="card">
	<h2>Get involved</h2>
	<ul class="links">
		<li><a href="/chat">Join the community chat</a></li>
		<li><a href="/schedule">See what's on</a></li>
		<li><a href="/login">Sign in for DJ tools</a></li>
	</ul>
</section>

<style>
	.hero {
		padding: 2rem 0 1.5rem;
	}

	.eyebrow {
		margin: 0 0 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		font-size: 0.8rem;
		color: var(--vr-accent-strong);
	}

	h1 {
		margin: 0;
		font-size: clamp(2.2rem, 6vw, 3.6rem);
		line-height: 1.05;
		letter-spacing: -0.02em;
	}

	.accent {
		background: linear-gradient(90deg, var(--vr-accent), var(--vr-live));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.lede {
		max-width: 34rem;
		margin: 1rem 0 1.5rem;
		color: var(--vr-muted);
		font-size: 1.05rem;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.ghost-link {
		color: var(--vr-accent-strong);
		text-decoration: none;
	}

	.ghost-link:hover {
		text-decoration: underline;
	}

	.card {
		margin-top: 1.5rem;
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		padding: 1.25rem 1.5rem;
	}

	.card h2 {
		margin: 0 0 0.4rem;
		font-size: 1.1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.badge {
		font-style: normal;
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.badge.live {
		background: rgba(255, 77, 109, 0.15);
		border: 1px solid rgba(255, 77, 109, 0.5);
		color: #ff8098;
		animation: pulse 2s ease-in-out infinite;
	}

	.badge.replay {
		background: var(--vr-surface-raised);
		border: 1px solid var(--vr-border);
		color: var(--vr-muted);
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	.track {
		margin: 0 0 0.5rem;
		color: var(--vr-text);
	}

	.showlink {
		color: var(--vr-accent-strong);
		text-decoration: none;
		display: inline-block;
	}

	.showlink:hover {
		text-decoration: underline;
	}

	.muted {
		color: var(--vr-muted);
		margin: 0;
	}

	.listen {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.listen-art {
		flex-shrink: 0;
	}

	.listen-art img,
	.art-fallback {
		width: 96px;
		height: 96px;
		border-radius: 14px;
		object-fit: cover;
		border: 1px solid var(--vr-border);
		background: var(--vr-surface-raised);
	}

	.art-fallback {
		display: grid;
		place-items: center;
		color: var(--vr-muted);
	}

	.art-fallback svg {
		width: 28px;
		height: 28px;
		margin-left: 2px;
	}

	.listen-copy {
		max-width: 32rem;
	}

	.big-play {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		border: none;
		background: var(--vr-accent);
		color: #fff;
		cursor: pointer;
	}

	.big-play svg {
		width: 26px;
		height: 26px;
		display: block;
		margin-left: 2px;
	}

	.big-play:hover {
		background: var(--vr-accent-strong);
	}

	.links {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.links a {
		color: var(--vr-accent-strong);
		text-decoration: none;
	}

	.links a:hover {
		text-decoration: underline;
	}
</style>
