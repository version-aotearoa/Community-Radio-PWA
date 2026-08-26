import { writable } from 'svelte/store';

interface PlayerRequest {
	n: number;
}

export interface MediaSource {
	url: string;
	title: string;
	artist: string | null;
	art: string | null;
}

export type PlaybackSource = { kind: 'live' } | ({ kind: 'media' } & MediaSource);

export const playerRequest = writable<PlayerRequest>({ n: 0 });

/** What the global stream player is currently playing (live or a recording). */
export const playback = writable<PlaybackSource>({ kind: 'live' });

/** Ask the global stream player to return to the live stream and play. */
export function requestPlay() {
	playback.set({ kind: 'live' });
	playerRequest.update((p) => ({ n: p.n + 1 }));
}

/** Ask the global stream player to play a recording (replay). */
export function playMedia(source: MediaSource) {
	playback.set({ kind: 'media', ...source });
}
