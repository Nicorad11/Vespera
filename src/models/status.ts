import { translate, weekdayShort, type Lang } from '../i18n/translate';
import { openIntervals, type OpeningHours } from './openingHours';
import { CPH_TIME_ZONE, DAY_MS, formatInstantClock, MINUTE_MS, toZoned } from './time';

export type OpenStatus =
  /** `until` is `null` when the place stays open for the whole look-ahead window (24/7). */
  | { isOpen: true; until: number | null }
  /** `opensAt` is `null` when nothing opens within the look-ahead window. */
  | { isOpen: false; opensAt: number | null };

/** How far ahead to look for the next opening or closing. */
export const LOOKAHEAD_DAYS = 8;
/** Below this many minutes an open place counts as "closing soon" (orange). */
export const CLOSING_SOON_MINUTES = 45;
/** At or below this many minutes the status pill pulses. */
export const URGENT_MINUTES = 15;

export function statusAt(hours: OpeningHours, now: number, timeZone = CPH_TIME_ZONE): OpenStatus {
  const horizon = now + LOOKAHEAD_DAYS * DAY_MS;
  const intervals = openIntervals(hours, now, horizon, timeZone);
  const current = intervals.find((i) => i.start <= now && now < i.end);
  if (current) return { isOpen: true, until: current.end >= horizon ? null : current.end };
  const next = intervals.find((i) => i.start > now);
  return { isOpen: false, opensAt: next?.start ?? null };
}

export function isOpenNow(hours: OpeningHours, now: number, timeZone = CPH_TIME_ZONE): boolean {
  return statusAt(hours, now, timeZone).isOpen;
}

/** Whole minutes left until `instant`, rounded up (14:35:10 → 15:00 is 25 min). */
export function minutesUntil(instant: number, now: number): number {
  return Math.ceil((instant - now) / MINUTE_MS);
}

export type StatusTone = 'open' | 'closingSoon' | 'closed';

export interface StatusDisplay {
  tone: StatusTone;
  /** Short pill text: "Open", "Closes in 25 min", "Closed · opens 08:00". */
  label: string;
  /** Longer line for detail views: "Open until 22:00", "Open 24 hours"… */
  detail: string;
  /** True when closing within `URGENT_MINUTES`; drives the gentle pulse. */
  pulse: boolean;
}

export function describeStatus(
  status: OpenStatus,
  now: number,
  lang: Lang,
  timeZone = CPH_TIME_ZONE,
): StatusDisplay {
  if (status.isOpen) {
    if (status.until === null) {
      const label = translate(lang, 'status.open');
      return { tone: 'open', label, detail: translate(lang, 'status.open24h'), pulse: false };
    }
    const minutes = minutesUntil(status.until, now);
    const detail = translate(lang, 'status.openUntil', { time: formatInstantClock(status.until, timeZone) });
    if (minutes < CLOSING_SOON_MINUTES) {
      return {
        tone: 'closingSoon',
        label: translate(lang, 'status.closesIn', { minutes }),
        detail,
        pulse: minutes <= URGENT_MINUTES,
      };
    }
    return { tone: 'open', label: translate(lang, 'status.open'), detail, pulse: false };
  }

  if (status.opensAt === null) {
    const label = translate(lang, 'status.closed');
    return { tone: 'closed', label, detail: label, pulse: false };
  }
  const when = openingTimeLabel(status.opensAt, now, lang, timeZone);
  const label = translate(lang, 'status.closedOpens', { when });
  return { tone: 'closed', label, detail: label, pulse: false };
}

/**
 * "08:00" when the opening is less than 24 hours away (there is only one
 * 08:00 in that window, so the time alone is unambiguous), otherwise with the
 * weekday: "Mon 08:00".
 */
export function openingTimeLabel(opensAt: number, now: number, lang: Lang, timeZone = CPH_TIME_ZONE): string {
  const time = formatInstantClock(opensAt, timeZone);
  if (opensAt - now < DAY_MS) return time;
  return `${weekdayShort(lang, toZoned(opensAt, timeZone).weekday)} ${time}`;
}
