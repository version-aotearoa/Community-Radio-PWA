import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			version: {
				// Detect new deploys so open tabs reload fresh content instead of
				// running the previous build. version.json is served no-cache and
				// excluded from the worker, so polling always sees the latest.
				pollInterval: 60000
			}
		})
	]
});
