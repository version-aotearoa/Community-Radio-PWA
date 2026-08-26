import { writable } from 'svelte/store';
import { fetchLive, type LivePayload } from '$lib/api/live';

export const live = writable<LivePayload | null>(null);

let started = false;

/** Starts a single shared poller (idempotent). Pauses while the tab is hidden. */
export function startLivePolling() {
	if (started || typeof document === 'undefined') return;
	started = true;

	const tick = async () => {
		const payload = await fetchLive();
		if (payload) live.set(payload);
	};

	void tick();
	const timer = setInterval(() => {
		if (!document.hidden) void tick();
	}, 30_000);

	if (typeof window !== 'undefined') {
		window.addEventListener('visibilitychange', () => {
			if (!document.hidden) void tick();
		});
	}
	// keep the interval from keeping the module alive forever in dev HMR edge cases
	void timer;
}
