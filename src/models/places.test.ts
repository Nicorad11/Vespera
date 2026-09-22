import { describe, expect, it } from 'vitest';
import raw from '../resources/places.json';
import { distanceMeters, SOLBJERG_PLADS } from './geo';
import { openIntervals } from './openingHours';
import { parsePlaces } from './places';
import { CHEAP_MEAL_DKK } from './suggestions';
import { cph } from './testUtils';
import { toZoned } from './time';

const { places, errors } = parsePlaces(raw);

describe('bundled places.json', () => {
  it('parses without a single error', () => {
    expect(errors).toEqual([]);
  });

  it('has around twenty places', () => {
    expect(places.length).toBeGreaterThanOrEqual(18);
  });

  it('marks every seed place as unverified', () => {
    expect(places.every((p) => p.verified === false)).toBe(true);
  });

  it('includes the CBS Library at Solbjerg Plads as a study spot', () => {
    const library = places.find((p) => p.id === 'cbs-library');
    expect(library).toMatchObject({ campus: 'solbjergPlads', hasOutlets: true });
    expect(library?.categories).toContain('study');
  });

  it('covers all five campuses', () => {
    expect(new Set(places.map((p) => p.campus)).size).toBe(5);
  });

  it('keeps every place within walking distance of CBS', () => {
    for (const place of places) {
      expect(distanceMeters(SOLBJERG_PLADS, place.coordinate), place.id).toBeLessThan(3000);
    }
  });

  it('only lists cheap meals under the Food category', () => {
    for (const place of places.filter((p) => p.categories.includes('food'))) {
      expect(place.cheapestItem?.price, place.id).toBeLessThanOrEqual(CHEAP_MEAL_DKK);
    }
  });

  it('only lists study spots that have power outlets', () => {
    for (const place of places.filter((p) => p.categories.includes('study'))) {
      expect(place.hasOutlets, place.id).toBe(true);
    }
  });

  it('only lists late-night places that are open after 22:00 at least once a week', () => {
    const weekStart = cph(2026, 9, 21);
    const weekEnd = cph(2026, 9, 28);
    for (const place of places.filter((p) => p.categories.includes('lateNight'))) {
      const late = openIntervals(place.openingHours, weekStart, weekEnd).some((interval) => {
        const end = toZoned(interval.end);
        const endsLate = end.hour >= 22 || end.hour < 6 || interval.end - interval.start >= 86_400_000;
        return endsLate;
      });
      expect(late, place.id).toBe(true);
    }
  });
});

describe('validation messages', () => {
  it('explains what is wrong and where', () => {
    const result = parsePlaces({
      places: [
        {
          id: 'broken-place',
          name: 'Broken',
          categories: ['food', 'pizza'],
          campus: 'solbjergPlads',
          coordinate: { latitude: 55.68, longitude: 12.53 },
          address: 'Somewhere 1',
          openingHours: { mon: ['8-16'], funday: [] },
          priceLevel: 4,
          hasOutlets: true,
          wifi: 'yes',
          noiseLevel: 'loud',
        },
      ],
    });
    expect(result.places).toEqual([]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"broken-place": categories contains "pizza"'),
        expect.stringContaining('openingHours.mon has an invalid range "8-16"'),
        expect.stringContaining('unknown key "funday"'),
        expect.stringContaining('priceLevel must be 1, 2 or 3'),
        expect.stringContaining('wifi must be true or false'),
        expect.stringContaining('noiseLevel must be one of quiet, medium, lively'),
      ]),
    );
  });

  it('rejects duplicate ids', () => {
    const first = raw.places[0];
    const result = parsePlaces({ places: [first, first] });
    expect(result.places).toHaveLength(1);
    expect(result.errors).toEqual([`"${first?.id}": id is used more than once`]);
  });

  it('treats missing weekdays as closed and missing holidays as "same as usual"', () => {
    const base = raw.places[0]!;
    const result = parsePlaces({ places: [{ ...base, openingHours: { mon: ['08:00-16:00'] } }] });
    expect(result.errors).toEqual([]);
    expect(result.places[0]?.openingHours.weekly.tue).toEqual([]);
    expect(result.places[0]?.openingHours.holidays).toBeNull();
  });
});
