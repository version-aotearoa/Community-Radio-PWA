import { get, writable } from 'svelte/store';

const AUTOPLAY_KEY = 'vr-autoplay';

// Autoplay is DISABLED until full PWA features are ready (2026-09-02): the
// switch is hidden from the player and the stored opt-in is ignored, so the
// stream never auto-starts on load. Flip to true (and restore the switch in
// StreamPlayer) when re-enabling.
const AUTOPLAY_ENABLED = false;

function readAutoplay(): boolean {
	if (!AUTOPLAY_ENABLED) return false;
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(AUTOPLAY_KEY) === 'on';
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
	/** Originating show, when playing an archive episode (used for player links). */
	show?: { id: string; title: string } | null;
	/** Direct URL to the episode page (for sharing from the player). */
	href?: string | null;
	/** Broadcast id of the archive episode being played. */
	broadcastId?: string | null;
	/** Air date (YYYY-MM-DD) of the archive episode being played. */
	date?: string | null;
}

export type PlaybackSource = { kind: 'live' } | ({ kind: 'media' } & MediaSource);

export const playerRequest = writable<PlayerRequest>({ n: 0 });

/** Play/pause toggle signal: asks the player to flip its current state. */
export const playerToggle = writable<PlayerRequest>({ n: 0 });

/** Minimise-the-player signal (e.g. clicking the home logo while on /). */
export const playerCollapse = writable<PlayerRequest>({ n: 0 });

/** Whether audio is currently playing (live or recording). */
export const streamPlaying = writable(false);

export function requestTogglePlay() {
	playerToggle.update((p) => ({ n: p.n + 1 }));
}

/** Ask the global stream player to collapse/minimise its max sheet. */
export function requestCollapsePlayer() {
	playerCollapse.update((p) => ({ n: p.n + 1 }));
}

/** What the global stream player is currently playing (live or a recording). */
export const playback = writable<PlaybackSource>({ kind: 'live' });

/** Ask the global stream player to return to the live stream and play. */
export function requestPlay() {
	if (get(playback).kind !== 'live') {
		// media → live: the playback effect switches engines and starts audio.
		playback.set({ kind: 'live' });
	} else {
		// already live but paused: resume only (no kind change, no double play).
		playerRequest.update((p) => ({ n: p.n + 1 }));
	}
}

/** Ask the global stream player to play a recording (replay). */
export function playMedia(source: MediaSource) {
	playback.set({ kind: 'media', ...source });
}
