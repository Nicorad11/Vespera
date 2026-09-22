import { describe, expect, it } from 'vitest';
import { danishHoliday, danishHolidays, easterSunday } from './holidays';
import { statusAt } from './status';
import { cph, hours } from './testUtils';

describe('Easter', () => {
  it.each([
    [2024, 3, 31],
    [2025, 4, 20],
    [2026, 4, 5],
    [2027, 3, 28],
    [2030, 4, 21],
  ])('Easter Sunday %i is %i/%i', (year, month, day) => {
    expect(easterSunday(year)).toEqual({ year, month, day });
  });
});

describe('Danish holidays', () => {
  it('lists the moveable feasts relative to Easter', () => {
    const byId = Object.fromEntries(danishHolidays(2026).map((h) => [h.id, h.date]));
    expect(byId.maundyThursday).toEqual({ year: 2026, month: 4, day: 2 });
    expect(byId.goodFriday).toEqual({ year: 2026, month: 4, day: 3 });
    expect(byId.easterMonday).toEqual({ year: 2026, month: 4, day: 6 });
    expect(byId.ascensionDay).toEqual({ year: 2026, month: 5, day: 14 });
    expect(byId.whitSunday).toEqual({ year: 2026, month: 5, day: 24 });
    expect(byId.whitMonday).toEqual({ year: 2026, month: 5, day: 25 });
  });

  it('recognises fixed holidays', () => {
    expect(danishHoliday({ year: 2026, month: 12, day: 25 })).toBe('christmasDay');
    expect(danishHoliday({ year: 2026, month: 6, day: 5 })).toBe('constitutionDay');
    expect(danishHoliday({ year: 2027, month: 1, day: 1 })).toBe('newYearsDay');
  });

  it('does not treat ordinary days as holidays', () => {
    expect(danishHoliday({ year: 2026, month: 9, day: 22 })).toBeNull();
    // Store Bededag (4th Friday after Easter) was abolished from 2024.
    expect(danishHoliday({ year: 2026, month: 5, day: 1 })).toBeNull();
  });
});

describe('holiday opening hours', () => {
  // Christmas Day 2026 is a Friday; Boxing Day a Saturday; the 28th a Monday.
  const canteen = hours({ mon: ['08:00-16:00'], fri: ['08:00-16:00'] }, []);

  it('uses holiday hours instead of the weekday', () => {
    expect(statusAt(canteen, cph(2026, 12, 25, 12))).toEqual({
      isOpen: false,
      opensAt: cph(2026, 12, 28, 8),
    });
  });

  it('falls back to weekday hours when no holiday hours are given', () => {
    const noHolidayRule = hours({ fri: ['08:00-16:00'] });
    expect(statusAt(noHolidayRule, cph(2026, 12, 25, 12)).isOpen).toBe(true);
  });

  it('applies special holiday ranges', () => {
    const shortDay = hours({ fri: ['08:00-22:00'] }, ['10:00-14:00']);
    expect(statusAt(shortDay, cph(2026, 12, 25, 12))).toEqual({ isOpen: true, until: cph(2026, 12, 25, 14) });
  });

  it('keeps an overnight range that started the evening before a holiday', () => {
    // Wednesday 23 Dec runs until 02:00 on Christmas Eve, which is itself closed.
    const bar = hours({ wed: ['20:00-02:00'], thu: ['20:00-02:00'] }, []);
    expect(statusAt(bar, cph(2026, 12, 24, 1))).toEqual({ isOpen: true, until: cph(2026, 12, 24, 2) });
    expect(statusAt(bar, cph(2026, 12, 24, 21)).isOpen).toBe(false);
  });
});
