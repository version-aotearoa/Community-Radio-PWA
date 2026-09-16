/**
 * Station 4-week cycle + calendar-week helpers.
 *
 * Pure functions with no server dependencies, so both the server (`shows.ts`)
 * and client components (the schedule page) can use them.
 */

/** Station-wide 4-week cycle anchor (a Monday). Cycle week 1 begins here. */
export const CYCLE_ANCHOR = '2026-01-05';

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

/** 1-4: which week of the 4-week station cycle contains `dateStr`. */
export function cycleWeekOf(dateStr: string): number {
	const [y, m, d] = dateStr.split('-').map(Number);
	const [ay, am, ad] = CYCLE_ANCHOR.split('-').map(Number);
	const ms = new Date(Date.UTC(y, m - 1, d)).getTime() - new Date(Date.UTC(ay, am - 1, ad)).getTime();
	const weeks = Math.floor(ms / (7 * 24 * 3600 * 1000));
	return ((weeks % 4) + 4) % 4 + 1;
}

/** The Monday of the Mon–Sun week containing `dateStr` (UTC date math). */
export function startOfWeek(dateStr: string): string {
	const [y, m, d] = dateStr.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	// getUTCDay: 0=Sun..6=Sat → shift so Monday is the first day.
	const offset = (date.getUTCDay() + 6) % 7;
	date.setUTCDate(date.getUTCDate() - offset);
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
