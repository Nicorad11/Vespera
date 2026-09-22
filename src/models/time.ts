/**
 * Wall-clock helpers for Europe/Copenhagen.
 *
 * Opening hours are always evaluated on Copenhagen time, whatever time zone the
 * device is set to, so a student with a phone still on another zone after a
 * trip home gets the right answer.
 */

export const CPH_TIME_ZONE = 'Europe/Copenhagen';
export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

/** A calendar date with no time attached. `month` is 1-based. */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export interface ZonedDateTime extends CivilDate {
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday (same as `Date#getDay`). */
  weekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Breaks an instant down into wall-clock fields in `timeZone`. */
export function toZoned(instant: number | Date, timeZone = CPH_TIME_ZONE): ZonedDateTime {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const date = { year: field('year'), month: field('month'), day: field('day') };
  return {
    ...date,
    // Some engines print midnight as "24" even with h23; normalise it.
    hour: field('hour') % 24,
    minute: field('minute'),
    second: field('second'),
    weekday: weekdayOf(date),
  };
}

export function civilDateOf(instant: number | Date, timeZone = CPH_TIME_ZONE): CivilDate {
  const { year, month, day } = toZoned(instant, timeZone);
  return { year, month, day };
}

export function weekdayOf(date: CivilDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds. */
function offsetAt(instant: number, timeZone: string): number {
  const z = toZoned(instant, timeZone);
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * The instant at which the wall clock in `timeZone` shows `minutes` past
 * midnight on `date`. `minutes` may be 1440 (midnight at the end of the day).
 * Times skipped by a daylight-saving jump resolve forward (02:30 → 03:30).
 */
export function fromZoned(date: CivilDate, minutes: number, timeZone = CPH_TIME_ZONE): number {
  const asUtc = Date.UTC(date.year, date.month - 1, date.day, 0, minutes);
  let instant = asUtc - offsetAt(asUtc, timeZone);
  const corrected = offsetAt(instant, timeZone);
  if (asUtc - instant !== corrected) instant = asUtc - corrected;
  return instant;
}

export function minutesOfDay(z: Pick<ZonedDateTime, 'hour' | 'minute'>): number {
  return z.hour * 60 + z.minute;
}

/** "08:05". Minute 1440 prints as "00:00". */
export function formatClock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** Copenhagen wall-clock time of an instant, e.g. "22:30". */
export function formatInstantClock(instant: number, timeZone = CPH_TIME_ZONE): string {
  return formatClock(minutesOfDay(toZoned(instant, timeZone)));
}
