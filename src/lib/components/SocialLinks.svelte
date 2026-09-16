<script lang="ts">
	// Social icon links — one source of truth for Bluesky + GitHub.
	let { size = 15, onlink }: { size?: number; onlink?: () => void } = $props();
</script>

<span class="social-links">
	<a
		class="social"
		href="https://bsky.app/profile/versionradiolive.bsky.social"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Bluesky"
		title="Bluesky"
		onclick={onlink}
	>
		<svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>
	</a>
	<a
		class="social"
		href="https://github.com/version-aotearoa/Community-Radio-PWA"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="GitHub"
		title="GitHub"
		onclick={onlink}
	>
		<svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
	</a>
</span>

<style>
	.social-links {
		display: inline-flex;
		align-items: center;
		gap: 1rem;
	}

	.social {
		display: inline-flex;
		align-items: center;
		color: var(--vr-muted);
	}

	.social:hover {
		color: var(--vr-text);
	}

	.social svg {
		display: block;
	}
</style>
