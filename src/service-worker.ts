/// <reference types="@sveltejs/kit" />
import { build, files, prerendered, version } from '$service-worker';

const CACHE = `version-radio-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

	const url = new URL(request.url);

	// Never cache API or chat endpoints.
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/chat/')) return;

	if (request.headers.get('accept')?.includes('text/html')) {
		// Network-first for pages so content stays fresh, with cached fallback offline.
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(CACHE).then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(() => caches.match(request))
		);
		return;
	}

	// Cache-first for static assets (build output, fonts, icons).
	event.respondWith(
		caches.match(request).then(
			(cached) =>
				cached ??
				fetch(request).then((response) => {
					const copy = response.clone();
					caches.open(CACHE).then((cache) => cache.put(request, copy));
					return response;
				})
		)
	);
});
