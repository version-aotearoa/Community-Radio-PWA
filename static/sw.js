/**
 * Minimal service worker (created for installability + asset caching).
 * Same-origin static assets: stale-while-revalidate. Navigations: network
 * only (never serves stale SSR). APIs/media: untouched.
 */
const CACHE = 'vr-static-v1';

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== location.origin) return;
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) return;
	if (request.mode === 'navigate') return;

	event.respondWith(
		caches.match(request).then((cached) => {
			const refresh = fetch(request)
				.then((res) => {
					if (res.ok) {
						const copy = res.clone();
						caches.open(CACHE).then((cache) => cache.put(request, copy));
					}
					return res;
				})
				.catch(() => cached);
			return cached || refresh;
		})
	);
});
