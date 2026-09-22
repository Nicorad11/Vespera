import { addDays, compareCivil, type CivilDate } from './time';

/**
 * Days when Danish opening hours usually change. This is the official list of
 * public holidays (helligdage) plus Constitution Day, Christmas Eve and New
 * Year's Eve, when most shops, canteens and libraries close or shorten hours.
 * Store Bededag was abolished from 2024, so it is not included.
 */
export type HolidayId =
  | 'newYearsDay'
  | 'maundyThursday'
  | 'goodFriday'
  | 'easterSunday'
  | 'easterMonday'
  | 'ascensionDay'
  | 'whitSunday'
  | 'whitMonday'
  | 'constitutionDay'
  | 'christmasEve'
  | 'christmasDay'
  | 'boxingDay'
  | 'newYearsEve';

export interface Holiday {
  id: HolidayId;
  date: CivilDate;
}

/** Gregorian Easter Sunday (Anonymous / Meeus–Jones–Butcher algorithm). */
export function easterSunday(year: number): CivilDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

const cache = new Map<number, Holiday[]>();

export function danishHolidays(year: number): Holiday[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const fixed = (month: number, day: number): CivilDate => ({ year, month, day });
  const holidays: Holiday[] = [
    { id: 'newYearsDay', date: fixed(1, 1) },
    { id: 'maundyThursday', date: addDays(easter, -3) },
    { id: 'goodFriday', date: addDays(easter, -2) },
    { id: 'easterSunday', date: easter },
    { id: 'easterMonday', date: addDays(easter, 1) },
    { id: 'ascensionDay', date: addDays(easter, 39) },
    { id: 'whitSunday', date: addDays(easter, 49) },
    { id: 'whitMonday', date: addDays(easter, 50) },
    { id: 'constitutionDay', date: fixed(6, 5) },
    { id: 'christmasEve', date: fixed(12, 24) },
    { id: 'christmasDay', date: fixed(12, 25) },
    { id: 'boxingDay', date: fixed(12, 26) },
    { id: 'newYearsEve', date: fixed(12, 31) },
  ];
  cache.set(year, holidays);
  return holidays;
}

export function danishHoliday(date: CivilDate): HolidayId | null {
  const match = danishHolidays(date.year).find((h) => compareCivil(h.date, date) === 0);
  return match?.id ?? null;
}
