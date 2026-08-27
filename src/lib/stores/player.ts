import { writable } from 'svelte/store';

const AUTOPLAY_KEY = 'vr-autoplay';

function readAutoplay(): boolean {
	if (typeof localStorage === 'undefined') return true;
	return localStorage.getItem(AUTOPLAY_KEY) !== 'off';
}

/** Whether the stream player should start playing automatically on page load. */
export const autoplay = writable<boolean>(readAutoplay());

autoplay.subscribe((value) => {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(AUTOPLAY_KEY, value ? 'on' : 'off');
});

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

/** Play/pause toggle signal: asks the player to flip its current state. */
export const playerToggle = writable<PlayerRequest>({ n: 0 });

/** Whether audio is currently playing (live or recording). */
export const streamPlaying = writable(false);

export function requestTogglePlay() {
	playerToggle.update((p) => ({ n: p.n + 1 }));
}

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
