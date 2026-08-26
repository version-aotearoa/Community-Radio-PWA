<script lang="ts">
	import { Button } from '@svar-ui/svelte-core';
	import { requestPlay } from '$lib/stores/player';
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
		<div class="listen-copy">
			<h2>Listening now</h2>
			<p class="muted">
				Hit play and take Version Radio with you — the player stays pinned to the bottom of the
				screen while you browse.
			</p>
		</div>
		<button class="big-play" onclick={requestPlay} aria-label="Play live stream">▶</button>
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
		color: #0b0b11;
		font-size: 1.4rem;
		cursor: pointer;
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
