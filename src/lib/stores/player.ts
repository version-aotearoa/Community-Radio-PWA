import { writable } from 'svelte/store';

interface PlayerRequest {
	n: number;
}

export const playerRequest = writable<PlayerRequest>({ n: 0 });

/** Ask the global stream player to start playing. */
export function requestPlay() {
	playerRequest.update((p) => ({ n: p.n + 1 }));
}
