// Week helpers. Weeks run Monday (day 0) to Sunday (day 6). We work in UTC and
// store weekStart as a date-only value to avoid timezone drift.

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Midnight-UTC Date for a YYYY-MM-DD string. */
export function dateOnly(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** The Monday (00:00 UTC) of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const copy = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dow = copy.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diff = dow === 0 ? -6 : 1 - dow; // shift back to Monday
  return addDays(copy, diff);
}

/** Monday of the current week. */
export function currentWeekStart(): string {
  return formatDateOnly(mondayOf(new Date()));
}

/**
 * Parse & normalize a weekStart param to the Monday of that week. Returns null
 * for invalid input.
 */
export function normalizeWeekStart(str: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = dateOnly(str);
  if (Number.isNaN(d.getTime())) return null;
  return formatDateOnly(mondayOf(d));
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekLabel(weekStart: string): string {
  const start = dateOnly(weekStart);
  const end = addDays(start, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
