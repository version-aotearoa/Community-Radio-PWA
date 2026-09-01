<script lang="ts">
	import { page } from '$app/state';

	const SITE_DESC =
		'Live shows, DJ tracklists, and community chat.';
	const DEFAULT_IMAGE = '/og-image.jpg';

	let {
		title = 'Version Radio · Aotearoa',
		description = SITE_DESC,
		image = DEFAULT_IMAGE,
		url,
		noindex = false
	}: {
		title?: string;
		description?: string;
		image?: string | null;
		url?: string;
		noindex?: boolean;
	} = $props();

	// og:image / og:url must be absolute. page.url.origin keeps them host-correct
	// per environment (prod / staging) without hardcoding a domain.
	const origin = $derived(page.url.origin);
	const absImage = $derived(new URL(image ?? DEFAULT_IMAGE, origin).href);
	const canonical = $derived(new URL(url ?? page.url.pathname, origin).href);
</script>

<svelte:head>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={absImage} />
	<meta property="og:url" content={canonical} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={absImage} />
	{#if noindex}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>
