<script lang="ts">
	import NewsActions from '$lib/components/NewsActions.svelte';
	import { SITE_TITLE } from '$lib/site';

	let { data } = $props();

	const posts = $derived(data.posts);

	function fmtDate(secs: number) {
		return new Intl.DateTimeFormat('en-NZ', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(secs * 1000));
	}

	const TEASER_MAX = 90;

	function teaser(text: string) {
		if (text.length <= TEASER_MAX) return text;
		const cut = text.slice(0, TEASER_MAX);
		const last = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('.'));
		return `${cut.slice(0, last > 80 ? last : TEASER_MAX).trimEnd()}…`;
	}
</script>

<svelte:head>
	<title>News — {SITE_TITLE}</title>
</svelte:head>

<div class="page">
	<header class="head">
		<h1 class="h-lg">News</h1>
		<p class="subtitle mono">Station notices, announcements, and goings-on from Version Radio.</p>
	</header>

	{#if posts.length === 0}
		<p class="empty mono">No news yet.</p>
	{:else}
		<ul class="list">
			{#each posts as post (post.id)}
				<li>
					<div class="row">
						<a class="row-link" href={`/news/${post.id}`}>
							{#if post.image}
								<div class="row-img">
									<img src={post.image} alt="" loading="lazy" />
								</div>
							{/if}
							<div class="row-body">
								<p class="mono row-meta">{fmtDate(post.created_at)}</p>
								<h2 class="h-md">{post.title}</h2>
								{#if post.bodyText}
									<p class="teaser">{teaser(post.bodyText)}</p>
								{/if}
							</div>
						</a>
						<div class="row-actions">
							<NewsActions
								compact
								postId={post.id}
								title={post.title}
								count={post.heartCount}
								active={post.myHeart}
							/>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.page {
		padding: 2rem;
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

	.empty {
		color: var(--vr-muted);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--vr-line);
	}

	.row {
		display: flex;
		align-items: stretch;
		border: 1px solid var(--vr-line);
		margin: -1px 0 0 -1px;
		background: var(--vr-surface);
		transition: background-color 150ms;
	}

	.row:hover {
		background: #fff;
	}

	.row-link {
		flex: 1;
		min-width: 0;
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
		padding: 1.25rem;
		text-decoration: none;
		color: var(--vr-text);
	}

	.row:hover .row-link {
		color: #000;
	}

	.row-actions {
		display: flex;
		align-items: center;
		padding: 1.25rem;
		border-left: 1px solid var(--vr-line-muted);
		flex-shrink: 0;
	}

	.row-img {
		flex-shrink: 0;
		width: 96px;
		aspect-ratio: 1;
		background: var(--vr-surface-highest);
	}

	.row-img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.row-body {
		min-width: 0;
	}

	.row-meta {
		margin: 0 0 0.4rem;
		color: var(--vr-muted);
		font-variant-numeric: tabular-nums;
	}

	.row:hover .row-meta {
		color: rgba(0, 0, 0, 0.75);
	}

	.row-body h2 {
		margin: 0;
	}

	.teaser {
		margin: 0.5rem 0 0.75rem;
		color: var(--vr-muted);
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.row:hover .teaser {
		color: rgba(0, 0, 0, 0.8);
	}

	@media (max-width: 480px) {
		.row {
			flex-direction: column;
		}

		.row-link {
			flex-direction: column;
			padding-bottom: 0;
		}

		.row-img {
			width: 100%;
			aspect-ratio: 1.6;
		}

		.row-actions {
			border-left: none;
			border-top: 1px solid var(--vr-line-muted);
			padding: 0.9rem 1.25rem;
			width: 100%;
		}
	}
</style>
