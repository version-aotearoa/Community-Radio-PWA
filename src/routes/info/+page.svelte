<script lang="ts">
	// Static info page — content is placeholder until finalised.
</script>

<svelte:head>
	<title>Info — Version Radio</title>
</svelte:head>

<div class="page">
	<header class="head">
		<h1 class="h-lg">Info</h1>
		<p class="subtitle mono">Station information, contact, and terms.</p>
	</header>

	<section class="card" id="contact">
		<h2 class="card-title">Contact</h2>
		<p>Email the station at <a class="mail" href="mailto:admin@version.nz">admin@version.nz</a>.</p>
	</section>

	<section class="card" id="terms">
		<h2 class="card-title">Terms</h2>
		<p>
			Terms of use are being drafted. Be decent in the chat — abusive behaviour may get you
			removed. Placeholder copy, to be finalised soon.
		</p>
	</section>

	<section class="card" id="about">
		<h2 class="card-title">About</h2>
		<p>
			Version Radio is an underground independent art-radio station from Aotearoa New Zealand
			— a 24/7 stream of live shows, DJ tracklists, replays, and community chat.
		</p>
	</section>
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 48rem;
	}

	.head {
		margin: 0 0 1.5rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 1rem;
	}

	.head h1 {
		margin: 0;
	}

	.subtitle {
		margin: 0.5rem 0 0;
		color: var(--vr-muted);
	}

	.card {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
		padding: 1.25rem 1.5rem;
		margin-bottom: 1.5rem;
		scroll-margin-top: 5rem;
	}

	.card-title {
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin: 0 0 1rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 0.6rem;
	}

	.card p {
		margin: 0;
		color: var(--vr-muted);
		line-height: 1.55;
	}

	.mail {
		color: var(--vr-text);
		text-decoration: underline;
	}
</style>
