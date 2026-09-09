/**
 * One-shot <img> error fallback: swaps `src` to `fallback` (the show's own /
 * DJ image) the first time the primary artwork fails to load — e.g. a
 * replay-derived /media URL whose upstream art hasn't been generated yet.
 * Never retries, so a genuinely-broken fallback can't loop.
 */
export function artOnError(e: Event, fallback: string | null | undefined) {
	if (!fallback) return;
	const img = e.currentTarget as HTMLImageElement;
	if (img.dataset.vrFb !== undefined) return;
	img.dataset.vrFb = '1';
	img.src = fallback;
}
