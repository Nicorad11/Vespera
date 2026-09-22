import { DAY_KEYS, parseTimeRange, type DayKey, type OpeningHours, type TimeRange } from './openingHours';
import { fromZoned } from './time';
import type { Place } from './types';

/** Epoch ms for a Copenhagen wall-clock time. */
export function cph(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  return fromZoned({ year, month, day }, hour * 60 + minute) + second * 1000;
}

function ranges(list: string[]): TimeRange[] {
  return list.map((text) => {
    const range = parseTimeRange(text);
    if (!range) throw new Error(`bad range in test: ${text}`);
    return range;
  });
}

export function hours(week: Partial<Record<DayKey, string[]>>, holidays: string[] | null = null): OpeningHours {
  const weekly = Object.fromEntries(DAY_KEYS.map((day) => [day, ranges(week[day] ?? [])])) as Record<DayKey, TimeRange[]>;
  return { weekly, holidays: holidays === null ? null : ranges(holidays) };
}

export function makePlace(overrides: Partial<Place> & Pick<Place, 'id'>): Place {
  return {
    name: overrides.id,
    categories: ['food'],
    campus: 'solbjergPlads',
    coordinate: { latitude: 55.6816, longitude: 12.5303 },
    address: 'Solbjerg Plads 3',
    openingHours: hours({}),
    priceLevel: 1,
    cheapestItem: null,
    hasOutlets: false,
    wifi: false,
    noiseLevel: 'medium',
    studentDiscount: null,
    tags: [],
    verified: false,
    ...overrides,
  };
}
