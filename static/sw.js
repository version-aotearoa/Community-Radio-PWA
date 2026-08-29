/**
 * Self-destructing service worker.
 *
 * The service worker is bypassed while stale-cache and lock-screen
 * regressions are open. On activate it purges all caches and
 * unregisters itself so previously installed workers are removed
 * on the next navigation after deploy.
 */
self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
			.then(() => self.registration.unregister())
	);
});
