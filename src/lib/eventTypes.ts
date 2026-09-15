/** Event subtypes (kind='event' only). Client-safe — no server imports. */
export const EVENT_TYPES = [
	{ id: 'guest-mix', label: 'Guest Mix' },
	{ id: 'hifi-session', label: 'HiFi Session' }
] as const;

export type EventType = (typeof EVENT_TYPES)[number]['id'];

export function isEventType(value: unknown): value is EventType {
	return EVENT_TYPES.some((t) => t.id === value);
}

/** Display label for an event type id, or null when unset/unknown. */
export function eventTypeLabel(value: string | null | undefined): string | null {
	return EVENT_TYPES.find((t) => t.id === value)?.label ?? null;
}
