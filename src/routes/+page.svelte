<script lang="ts">
	import { onMount } from 'svelte';
	import { requestPlay, requestTogglePlay, streamPlaying } from '$lib/stores/player';
	import { playMedia } from '$lib/stores/player';
	import { live, startLivePolling } from '$lib/stores/live';
	import { replayArtFromUrl } from '$lib/azuracast';

	let { data } = $props();

	const livePayload = $derived($live);
	const isPlaying = $derived($streamPlaying);
	const isLiveNow = $derived(livePayload?.live.isLive ?? false);

	const heroTitle = $derived(
		livePayload?.onAir?.title ?? 'Sounds for the between times'
	);
	const heroArt = $derived(
		livePayload?.nowPlaying?.art ?? livePayload?.onAir?.djImage ?? ''
	);

	function fmtBroadcastDate(dateStr: string) {
		return new Intl.DateTimeFormat('en-NZ', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		})
			.format(new Date(`${dateStr}T00:00:00Z`))
			.replace(/\s/g, ' ');
	}

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function playEpisode(show: { title: string; date: string; replay_url: string | null; dj_name?: string | null }) {
		if (!show.replay_url) return;
		playMedia({
			url: show.replay_url,
			title: `${show.title} — ${fmtBroadcastDate(show.date)}`,
			artist: show.dj_name ?? null,
			art: replayArtFromUrl(show.replay_url)
		});
	}

	onMount(() => startLivePolling());
</script>

<svelte:head>
	<title>Version Radio — independent radio</title>
</svelte:head>

<!-- Hero -->
<section class="hero">
	<div class="hero-bg" style={heroArt ? `background-image:url('${heroArt}')` : ''}>
		{#if !heroArt}
			<svg class="hero-mark" viewBox="0 0 80 70" fill="currentColor" aria-hidden="true">
				<path
					fill-rule="evenodd"
					d="M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z"
				/>
			</svg>
		{/if}
	</div>
	<div class="hero-shade"></div>
	<div class="hero-content">
		<div>
			<span class="sticker hero-sticker">{isLiveNow ? 'On air now' : 'Streaming now'}</span>
			<h1 class="hero-title">{heroTitle}</h1>
			<p class="hero-meta mono">Independent radio · Auckland, NZ · 24/7</p>
		</div>
		<button class="btn-block hero-play" onclick={requestTogglePlay}>
			{#if isPlaying}
				<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
					<path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" />
				</svg>
				<span>Pause</span>
			{:else}
				<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
					<path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" />
				</svg>
				<span>Play</span>
			{/if}
		</button>
	</div>
</section>

<!-- Latest Shows -->
<section class="section">
	<div class="section-head">
		<h2 class="h-lg">Latest Shows</h2>
		<a class="view-all" href="/shows">View all</a>
	</div>
	<div class="shows-grid">
		{#each data.latest as show (show.show_id)}
			<a class="showcard" href={`/shows/${show.show_id}/broadcasts/${show.broadcast_id}`}>
				<div class="showcard-art">
					{#if show.show_image}
						<img src={show.show_image} alt="" loading="lazy" />
					{:else if show.dj_name}
						<span class="art-fallback mono">{show.dj_name}</span>
					{:else}
						<div class="art-glyph" aria-hidden="true">
							<svg viewBox="0 0 80 70" fill="currentColor" width="42" height="37">
								<path
									fill-rule="evenodd"
									d="M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z"
								/>
							</svg>
						</div>
					{/if}
					{#if show.replay_url}
						<span class="sticker dark art-sticker">Replay</span>
						<button
							class="card-play"
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								playEpisode(show);
							}}
							aria-label={`Play ${show.title} replay`}
							title={`Play ${show.title} replay`}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" />
							</svg>
						</button>
					{/if}
				</div>
				<div class="showcard-meta mono">
					<span>{fmtBroadcastDate(show.date)}</span>
					<span>{show.dj_name ?? 'Version Radio'}</span>
				</div>
				<h3 class="h-md showcard-title">{show.title}</h3>
			</a>
		{:else}
			<p class="empty mono">No shows yet — the schedule is being built.</p>
		{/each}
	</div>
</section>

<!-- Get involved / Coming up -->
<section class="section split">
	<div class="panel get-involved">
		<h2 class="h-lg">Get Involved</h2>
		<p class="panel-copy">
			Version Radio is 24/7 independent radio. Tune in live, browse the schedule, and join the
			community chat while DJs run the show.
		</p>
		<div class="linkrows">
			<a class="linkrow" href="/chat">
				<span class="h-sm">Join the community chat</span>
				<span class="arrow" aria-hidden="true">→</span>
			</a>
			<a class="linkrow" href="/schedule">
				<span class="h-sm">See what's on</span>
				<span class="arrow" aria-hidden="true">→</span>
			</a>
			<a class="linkrow" href="/login">
				<span class="h-sm">Sign in for DJ tools</span>
				<span class="arrow" aria-hidden="true">→</span>
			</a>
		</div>
	</div>
	<div class="panel coming-up">
		<div class="coming-up-head">
			<h2 class="h-lg">Coming Up</h2>
			<a class="view-all" href="/schedule">Full schedule</a>
		</div>
		<ul>
			{#each data.upcoming as b (b.id)}
				<li class="slot" class:onair={b.onair}>
					<span class="slot-time mono" class:onair={b.onair}>
						{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}
					</span>
					<span class="h-sm slot-title">
						{#if b.onair}
							<span class="live-dot" aria-hidden="true"></span>
						{/if}
						{b.title}{#if b.dj_name} <span class="slot-dj">with {b.dj_name}</span>{/if}
					</span>
				</li>
			{:else}
				<li class="slot"><span class="slot-dj">Nothing scheduled yet.</span></li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.hero {
		position: relative;
		min-height: 70vh;
		min-height: min(70vh, 560px);
		display: flex;
		align-items: flex-end;
		border-bottom: 1px solid var(--vr-line);
		overflow: hidden;
	}

	.hero-bg {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
	}

	.hero-mark {
		position: absolute;
		left: 50%;
		top: 50%;
		width: min(38vw, 24rem);
		height: auto;
		color: var(--vr-surface-high);
		transform: translate(-50%, -50%);
	}

	.hero-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, #000 12%, rgba(0, 0, 0, 0.5) 55%, transparent 100%);
	}

	.hero-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 3rem 2rem 3rem;
		width: 100%;
	}

	.hero-sticker {
		margin-bottom: 0.85rem;
	}

	.hero-title {
		margin: 0;
		font-family: var(--vr-font-headline);
		font-weight: 400;
		font-size: clamp(2.6rem, 6.5vw, 7rem);
		line-height: 0.94;
		letter-spacing: -0.01em;
		text-transform: uppercase;
		max-width: 26ch;
	}

	.hero-meta {
		margin: 0.85rem 0 0;
		color: var(--vr-muted);
	}

	.hero-play {
		align-self: flex-start;
	}

	@media (min-width: 900px) {
		.hero-content {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
			padding: 3rem 2rem;
		}

		.hero-play {
			align-self: flex-end;
		}
	}

	.section {
		padding: 2rem;
		border-bottom: 1px solid var(--vr-line);
	}

	.section-head,
	.coming-up-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 0 1.25rem;
		/* border-bottom: 1px solid var(--vr-line); */
	}

	.section-head h2,
	.coming-up-head h2 {
		margin: 0;
	}

	.view-all {
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vr-muted);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
	}

	.view-all:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.shows-grid {
		display: grid;
		grid-template-columns: 1fr;
		border: 1px solid var(--vr-line);
	}

	@media (min-width: 640px) {
		.shows-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 960px) {
		.shows-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.showcard {
		display: block;
		text-decoration: none;
		color: var(--vr-text);
		border: 1px solid var(--vr-line);
		margin: -1px 0 0 -1px;
		padding: 1rem;
		transition: color 150ms, background-color 150ms;
	}

	.showcard:hover {
		background: #fff;
		color: #000;
	}

	.showcard-art {
		position: relative;
		aspect-ratio: 1;
		background: var(--vr-surface-highest);
		margin-bottom: 0.85rem;
	}

	.showcard-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.art-sticker {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
	}

	.card-play {
		position: absolute;
		right: 0.75rem;
		bottom: 0.75rem;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		background: #fff;
		color: #000;
		border: 1px solid #fff;
		cursor: pointer;
		padding: 0;
	}

	.card-play svg {
		width: 18px;
		height: 18px;
		display: block;
		margin-left: 2px;
	}

	.card-play:hover {
		background: #000;
		color: #fff;
		border-color: #fff;
	}

	.showcard:hover .card-play {
		background: #000;
		color: #fff;
	}

	.art-glyph,
	.art-fallback {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		color: var(--vr-faint);
	}

	.art-fallback {
		text-transform: uppercase;
		padding: 1rem;
		text-align: center;
		word-break: break-word;
	}

	.showcard-meta {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		color: var(--vr-muted);
		margin-bottom: 0.6rem;
	}

	.showcard:hover .showcard-meta {
		color: rgba(0, 0, 0, 0.75);
	}

	.showcard-title {
		margin: 0 0 0.25rem;
	}

	.empty {
		color: var(--vr-muted);
		padding: 1.5rem 0;
		margin: 0;
	}

	.split {
		display: grid;
		grid-template-columns: 1fr;
		padding-bottom: 0;
	}

	.panel {
		border: 1px solid var(--vr-line);
		margin: 0 0 -1px -1px;
	}

	.get-involved {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.panel-copy {
		margin: 0;
		color: var(--vr-muted);
		font-size: 1.15rem;
		line-height: 1.5;
		max-width: 34rem;
	}

	.linkrows {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.linkrow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		text-decoration: none;
		color: var(--vr-text);
		border: 1px solid var(--vr-line);
		margin: 0 0 1px;
		padding: 0.9rem 1rem;
		transition: color 150ms, background-color 150ms;
	}

	.linkrow:hover {
		background: #fff;
		color: #000;
	}

	.linkrow .arrow {
		font-family: var(--vr-font-body);
		font-weight: 600;
	}

	.coming-up,
	.coming-up ul {
		display: flex;
		flex-direction: column;
	}

	.coming-up-head {
		padding: 1.5rem 1.5rem 0;
		margin: 0 0 0.5rem;
	}

	.coming-up ul {
		margin: 0;
		padding: 0 1.5rem 0.5rem;
		list-style: none;
	}

	.slot {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 0.9rem 0;
		border-top: 1px solid var(--vr-line-muted);
	}

	.slot:first-child {
		border-top: 1px solid var(--vr-line-muted);
	}

	.slot-time {
		flex-shrink: 0;
		color: var(--vr-muted);
		font-variant-numeric: tabular-nums;
	}

	.slot-time.onair {
		color: var(--vr-green);
	}

	.slot-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.slot.onair {
		background: rgba(255, 255, 255, 0.08);
		margin: 0 -1rem;
		padding-left: 1rem;
		padding-right: 1rem;
	}

	.slot.onair .slot-dj {
		color: var(--vr-muted);
	}

	.live-dot {
		width: 0.55rem;
		height: 0.55rem;
		flex-shrink: 0;
		background: var(--vr-red);
		animation: live-pulse 1.6s ease-in-out infinite;
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

	.empty {
		grid-column: 1 / -1;
	}

	@media (min-width: 960px) {
		.split {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
</style>
