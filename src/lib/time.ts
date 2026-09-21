/**
 * Timezone helpers.
 *
 * Pure, no server dependencies, so both server (`shows.ts`) and client
 * components can use them. Station calendars use Pacific/Auckland wall-clock
 * dates + minutes-since-midnight; these convert such a slot to an exact UTC
 * instant without a date library.
 */

const DEFAULT_TZ = 'Pacific/Auckland';

/** Offset (ms) of `timeZone` from UTC at the instant `utcMs`. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
	const fmt = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
	const asUtc = Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		Number(parts.hour),
		Number(parts.minute),
		Number(parts.second)
	);
	return asUtc - utcMs;
}

/**
 * Epoch ms of a `YYYY-MM-DD` + minutes-since-midnight slot in `timeZone`.
 * The offset is applied twice so the result stays correct across DST edges.
 */
export function zonedWallTimeToUtcMs(
	dateStr: string,
	minutes: number,
	timeZone = DEFAULT_TZ
): number {
	const [y, m, d] = dateStr.split('-').map(Number);
	const wallAsUtc = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
	let ts = wallAsUtc;
	for (let i = 0; i < 2; i++) ts = wallAsUtc - zoneOffsetMs(ts, timeZone);
	return ts;
}
