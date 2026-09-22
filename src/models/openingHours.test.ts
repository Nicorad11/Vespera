import { describe, expect, it } from 'vitest';
import { openIntervals, parseClock, parseTimeRange, crossesMidnight, isAllDay } from './openingHours';
import { statusAt, isOpenNow } from './status';
import { cph, hours } from './testUtils';
import { fromZoned, toZoned } from './time';

// Reference week: Monday 21 September 2026 … Sunday 27 September 2026.
const MON = 21;
const FRI = 25;
const SAT = 26;
const SUN = 27;
const sep = (day: number, hour: number, minute = 0, second = 0) => cph(2026, 9, day, hour, minute, second);

describe('parsing', () => {
  it('parses clock times, including 24:00', () => {
    expect(parseClock('08:00')).toBe(480);
    expect(parseClock('8:05')).toBe(485);
    expect(parseClock('23:59')).toBe(1439);
    expect(parseClock('24:00')).toBe(1440);
    expect(parseClock('08.30')).toBe(510);
  });

  it.each(['', '8', '24:01', '25:00', '08:60', 'aa:bb', '08:0'])('rejects the clock time %j', (text) => {
    expect(parseClock(text)).toBeNull();
  });

  it('parses a normal range', () => {
    expect(parseTimeRange('08:00-16:00')).toEqual({ open: 480, close: 960 });
  });

  it('accepts en dashes and spaces', () => {
    expect(parseTimeRange('08:00 – 16:00')).toEqual({ open: 480, close: 960 });
  });

  it('flags ranges that run past midnight', () => {
    const range = parseTimeRange('18:00-02:00');
    expect(range).toEqual({ open: 1080, close: 120 });
    expect(crossesMidnight(range!)).toBe(true);
    expect(crossesMidnight(parseTimeRange('22:00-00:00')!)).toBe(true);
    expect(crossesMidnight(parseTimeRange('08:00-16:00')!)).toBe(false);
  });

  it('recognises all-day ranges', () => {
    expect(isAllDay(parseTimeRange('00:00-24:00')!)).toBe(true);
    expect(isAllDay(parseTimeRange('08:00-24:00')!)).toBe(false);
  });

  it.each(['08:00', '08:00-16:00-18:00', '24:00-02:00', '8-16', '08:00-25:00'])('rejects the range %j', (text) => {
    expect(parseTimeRange(text)).toBeNull();
  });
});

describe('open now: same-day hours', () => {
  const weekdays = hours({ mon: ['08:00-16:00'], tue: ['08:00-16:00'] });

  it('is open inside the range and reports the closing time', () => {
    expect(statusAt(weekdays, sep(MON, 12))).toEqual({ isOpen: true, until: sep(MON, 16) });
  });

  it('is open at the exact opening minute', () => {
    expect(isOpenNow(weekdays, sep(MON, 8))).toBe(true);
  });

  it('is closed at the exact closing minute', () => {
    expect(isOpenNow(weekdays, sep(MON, 16))).toBe(false);
    expect(isOpenNow(weekdays, sep(MON, 15, 59, 59))).toBe(true);
  });

  it('is closed before opening and points to the opening time', () => {
    expect(statusAt(weekdays, sep(MON, 7, 30))).toEqual({ isOpen: false, opensAt: sep(MON, 8) });
  });

  it('points to the next day after closing', () => {
    expect(statusAt(weekdays, sep(MON, 17))).toEqual({ isOpen: false, opensAt: sep(22, 8) });
  });

  it('handles a lunch break (several ranges in one day)', () => {
    const deli = hours({ mon: ['08:00-10:30', '11:00-15:00'] });
    expect(statusAt(deli, sep(MON, 10))).toEqual({ isOpen: true, until: sep(MON, 10, 30) });
    expect(statusAt(deli, sep(MON, 10, 45))).toEqual({ isOpen: false, opensAt: sep(MON, 11) });
    expect(statusAt(deli, sep(MON, 12))).toEqual({ isOpen: true, until: sep(MON, 15) });
  });

  it('skips closed days when looking for the next opening', () => {
    const weekdaysOnly = hours({ mon: ['08:00-16:00'], fri: ['08:00-16:00'] });
    expect(statusAt(weekdaysOnly, sep(SAT, 12))).toEqual({ isOpen: false, opensAt: cph(2026, 9, 28, 8) });
  });

  it('reports no next opening for a place that never opens', () => {
    expect(statusAt(hours({}), sep(MON, 12))).toEqual({ isOpen: false, opensAt: null });
  });
});

describe('open now: past midnight', () => {
  const bar = hours({ fri: ['18:00-02:00'] });

  it('is open before midnight and closes the next morning', () => {
    expect(statusAt(bar, sep(FRI, 23))).toEqual({ isOpen: true, until: sep(SAT, 2) });
  });

  it("is open after midnight on the previous day's hours", () => {
    // Saturday has no hours of its own; Friday's range spills over.
    expect(statusAt(bar, sep(SAT, 1, 30))).toEqual({ isOpen: true, until: sep(SAT, 2) });
  });

  it('is closed at the closing time and waits a week', () => {
    expect(statusAt(bar, sep(SAT, 2))).toEqual({ isOpen: false, opensAt: cph(2026, 10, 2, 18) });
  });

  it('is closed on Friday morning (the spill-over belongs to Thursday, which is closed)', () => {
    expect(isOpenNow(bar, sep(FRI, 1))).toBe(false);
  });

  it('wraps from Sunday night into Monday morning', () => {
    const late = hours({ sun: ['20:00-03:00'] });
    expect(statusAt(late, cph(2026, 9, 28, 2))).toEqual({ isOpen: true, until: cph(2026, 9, 28, 3) });
    expect(isOpenNow(late, sep(MON, 2))).toBe(true); // spill-over from Sunday 20 Sep
  });

  it('treats 22:00-00:00 as closing at midnight', () => {
    const cafe = hours({ mon: ['22:00-00:00'] });
    expect(statusAt(cafe, sep(MON, 23, 30))).toEqual({ isOpen: true, until: cph(2026, 9, 22, 0) });
    expect(isOpenNow(cafe, cph(2026, 9, 22, 0, 0))).toBe(false);
  });

  it('merges touching ranges across midnight', () => {
    const late = hours({ fri: ['20:00-24:00'], sat: ['00:00-03:00'] });
    expect(statusAt(late, sep(FRI, 23, 50))).toEqual({ isOpen: true, until: sep(SAT, 3) });
  });

  it('merges an overnight range with the next day’s early range', () => {
    const late = hours({ fri: ['18:00-02:00'], sat: ['01:00-04:00'] });
    expect(statusAt(late, sep(FRI, 19))).toEqual({ isOpen: true, until: sep(SAT, 4) });
  });
});

describe('open now: around the clock', () => {
  const kiosk = hours({
    mon: ['00:00-24:00'], tue: ['00:00-24:00'], wed: ['00:00-24:00'], thu: ['00:00-24:00'],
    fri: ['00:00-24:00'], sat: ['00:00-24:00'], sun: ['00:00-24:00'],
  });

  it('is open with no closing time', () => {
    expect(statusAt(kiosk, sep(MON, 3))).toEqual({ isOpen: true, until: null });
    expect(statusAt(kiosk, sep(SUN, 23, 59))).toEqual({ isOpen: true, until: null });
  });

  it('finds the closing time when one day is missing', () => {
    const mostly = hours({ mon: ['00:00-24:00'], tue: ['00:00-24:00'] });
    expect(statusAt(mostly, sep(MON, 12))).toEqual({ isOpen: true, until: cph(2026, 9, 23, 0) });
  });
});

describe('open now: daylight saving time', () => {
  // Denmark springs forward on Sunday 29 March 2026 at 02:00 → 03:00.
  it('uses wall-clock times on the spring-forward night', () => {
    const late = hours({ sun: ['01:00-04:00'] });
    const [interval] = openIntervals(late, cph(2026, 3, 29, 0), cph(2026, 3, 29, 12));
    expect(interval).toBeDefined();
    // 01:00 CET to 04:00 CEST is only two real hours.
    expect(interval!.end - interval!.start).toBe(2 * 3_600_000);
    const status = statusAt(late, cph(2026, 3, 29, 3, 30));
    expect(status).toEqual({ isOpen: true, until: cph(2026, 3, 29, 4) });
    expect(toZoned(cph(2026, 3, 29, 4)).hour).toBe(4);
  });

  // Denmark falls back on Sunday 25 October 2026 at 03:00 → 02:00.
  it('uses wall-clock times on the fall-back night', () => {
    const late = hours({ sun: ['01:00-04:00'] });
    const [interval] = openIntervals(late, cph(2026, 10, 25, 0), cph(2026, 10, 25, 12));
    expect(interval!.end - interval!.start).toBe(4 * 3_600_000);
    expect(statusAt(late, cph(2026, 10, 25, 3, 30))).toEqual({ isOpen: true, until: cph(2026, 10, 25, 4) });
  });

  it('resolves a time skipped by the jump forward', () => {
    const skipped = fromZoned({ year: 2026, month: 3, day: 29 }, 2 * 60 + 30);
    const z = toZoned(skipped);
    expect([z.hour, z.minute]).toEqual([3, 30]);
  });
});
