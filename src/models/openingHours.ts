import { danishHoliday } from './holidays';
import {
  addDays,
  civilDateOf,
  compareCivil,
  CPH_TIME_ZONE,
  formatClock,
  fromZoned,
  weekdayOf,
  type CivilDate,
} from './time';

/** JSON keys for weekdays, indexed like `Date#getDay` (0 = Sunday). */
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** Display order: Danish weeks start on Monday. */
export const WEEK_ORDER: readonly DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * One opening period in minutes since midnight. If `close <= open` the period
 * runs past midnight into the next day ("18:00-02:00"). `close` may be 1440
 * ("24:00").
 */
export interface TimeRange {
  open: number;
  close: number;
}

export interface OpeningHours {
  weekly: Record<DayKey, TimeRange[]>;
  /**
   * Hours on Danish public holidays. `null` means "same as a normal day";
   * an empty array means closed.
   */
  holidays: TimeRange[] | null;
}

/** A concrete open period. `end` is exclusive. Both are epoch milliseconds. */
export interface Interval {
  start: number;
  end: number;
}

const CLOCK_PATTERN = /^(\d{1,2})[:.](\d{2})$/;

/** "08:00" → 480. Accepts "24:00" (→ 1440). Returns `null` when invalid. */
export function parseClock(text: string): number | null {
  const match = CLOCK_PATTERN.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours === 24 && minutes === 0) return 1440;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** "08:00-16:00" (hyphen or en dash) → { open: 480, close: 960 }. */
export function parseTimeRange(text: string): TimeRange | null {
  const parts = text.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;
  const open = parseClock(parts[0] ?? '');
  const close = parseClock(parts[1] ?? '');
  if (open === null || close === null || open === 1440) return null;
  return { open, close };
}

export function crossesMidnight(range: TimeRange): boolean {
  return range.close <= range.open;
}

export function isAllDay(range: TimeRange): boolean {
  return range.open === 0 && (range.close === 1440 || range.close === 0);
}

export function formatTimeRange(range: TimeRange): string {
  return `${formatClock(range.open)}–${formatClock(range.close)}`;
}

/** The ranges that start on `date`, taking Danish holidays into account. */
export function rangesOn(hours: OpeningHours, date: CivilDate): TimeRange[] {
  if (hours.holidays && danishHoliday(date)) return hours.holidays;
  return hours.weekly[DAY_KEYS[weekdayOf(date)] ?? 'mon'];
}

/**
 * Every open interval that overlaps `[from, to)`, sorted and with overlapping
 * or touching periods merged. Merging matters: a place open "20:00-24:00" on
 * Friday and "00:00-03:00" on Saturday closes at 03:00, not at midnight.
 *
 * Each range is anchored to the day it starts on, so the day before `from` is
 * included to catch periods that spill over midnight.
 */
export function openIntervals(
  hours: OpeningHours,
  from: number,
  to: number,
  timeZone = CPH_TIME_ZONE,
): Interval[] {
  const lastDay = civilDateOf(to, timeZone);
  const raw: Interval[] = [];

  for (let day = addDays(civilDateOf(from, timeZone), -1); compareCivil(day, lastDay) <= 0; day = addDays(day, 1)) {
    for (const range of rangesOn(hours, day)) {
      const start = fromZoned(day, range.open, timeZone);
      const end = crossesMidnight(range)
        ? fromZoned(addDays(day, 1), range.close, timeZone)
        : fromZoned(day, range.close, timeZone);
      if (end > start) raw.push({ start, end });
    }
  }

  raw.sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of raw) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged.filter((interval) => interval.end > from && interval.start < to);
}
