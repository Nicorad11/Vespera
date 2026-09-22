import { describe, expect, it } from 'vitest';
import { detectLang, translate } from '../i18n/translate';
import { distanceMeters, formatDistance, walkingMinutes } from './geo';
import { snapshotPlaces, sortForFeed } from './ranking';
import { buildSuggestion, suggestionKind } from './suggestions';
import { cph, hours, makePlace } from './testUtils';

const origin = { latitude: 55.6816, longitude: 12.5303 };
// Roughly 111 m per 0.001° of latitude.
const north = (meters: number) => ({ latitude: origin.latitude + meters / 111_195, longitude: origin.longitude });
const allWeek = (range: string) =>
  hours({ mon: [range], tue: [range], wed: [range], thu: [range], fri: [range], sat: [range], sun: [range] });

describe('walking time', () => {
  it('uses 80 m per minute, rounded up, at least one minute', () => {
    expect(walkingMinutes(0)).toBe(1);
    expect(walkingMinutes(80)).toBe(1);
    expect(walkingMinutes(81)).toBe(2);
    expect(walkingMinutes(800)).toBe(10);
  });

  it('measures distance on the globe', () => {
    expect(distanceMeters(origin, north(500))).toBeCloseTo(500, -1);
  });

  it('formats distances per locale', () => {
    expect(formatDistance(432, 'en-GB')).toBe('430 m');
    expect(formatDistance(1250, 'en-GB')).toBe('1.3 km');
    expect(formatDistance(1250, 'da-DK')).toBe('1,3 km');
  });
});

describe('feed order', () => {
  const now = cph(2026, 9, 21, 12);
  const places = [
    makePlace({ id: 'closed-near', coordinate: north(50), openingHours: hours({}) }),
    makePlace({ id: 'open-far', coordinate: north(900), openingHours: allWeek('08:00-20:00') }),
    makePlace({ id: 'open-near', coordinate: north(200), openingHours: allWeek('08:00-20:00') }),
    makePlace({ id: 'closed-far', coordinate: north(1200), openingHours: allWeek('18:00-23:00') }),
  ];

  it('puts open places first, then sorts by walking distance', () => {
    const order = sortForFeed(snapshotPlaces(places, now, origin, 'en')).map((s) => s.place.id);
    expect(order).toEqual(['open-near', 'open-far', 'closed-near', 'closed-far']);
  });

  it('includes walking minutes and a status label', () => {
    const [first] = sortForFeed(snapshotPlaces(places, now, origin, 'en'));
    expect(first).toMatchObject({ walkingMinutes: 3, display: { label: 'Open' } });
  });
});

describe('"Right now" suggestions', () => {
  it('changes with the time of day', () => {
    expect(suggestionKind(cph(2026, 9, 21, 8))).toBe('morning');
    expect(suggestionKind(cph(2026, 9, 21, 12))).toBe('lunch');
    expect(suggestionKind(cph(2026, 9, 21, 15))).toBe('afternoon');
    expect(suggestionKind(cph(2026, 9, 21, 19))).toBe('evening');
    expect(suggestionKind(cph(2026, 9, 21, 22, 30))).toBe('lateNight');
    expect(suggestionKind(cph(2026, 9, 21, 2))).toBe('lateNight');
  });

  it('suggests the cheapest open food at lunch', () => {
    const now = cph(2026, 9, 21, 12);
    const places = [
      makePlace({ id: 'pricey', cheapestItem: { name: 'Bowl', price: 70 }, openingHours: allWeek('10:00-20:00') }),
      makePlace({ id: 'cheap', cheapestItem: { name: 'Slice', price: 25 }, openingHours: allWeek('10:00-20:00') }),
      makePlace({ id: 'cheapest-but-closed', cheapestItem: { name: 'Roll', price: 10 }, openingHours: hours({}) }),
    ];
    const suggestion = buildSuggestion(snapshotPlaces(places, now, origin, 'en'), now);
    expect(suggestion.kind).toBe('lunch');
    expect(suggestion.picks.map((s) => s.place.id)).toEqual(['cheap', 'pricey']);
  });

  it('suggests whatever stays open longest late at night', () => {
    const now = cph(2026, 9, 21, 23);
    const places = [
      makePlace({ id: 'till-1', categories: ['lateNight'], openingHours: allWeek('18:00-01:00') }),
      makePlace({ id: 'till-4', categories: ['lateNight'], openingHours: allWeek('18:00-04:00') }),
      makePlace({ id: 'food-only', categories: ['food'], openingHours: allWeek('18:00-05:00') }),
    ];
    const suggestion = buildSuggestion(snapshotPlaces(places, now, origin, 'en'), now);
    expect(suggestion.picks.map((s) => s.place.id)).toEqual(['till-4', 'till-1']);
  });

  it('points to the next opening when nothing fits', () => {
    const now = cph(2026, 9, 21, 3);
    const places = [makePlace({ id: 'late-opener', categories: ['lateNight'], openingHours: allWeek('18:00-23:00') })];
    const suggestion = buildSuggestion(snapshotPlaces(places, now, origin, 'en'), now);
    expect(suggestion.picks).toEqual([]);
    expect(suggestion.nextOpening?.place.id).toBe('late-opener');
  });
});

describe('i18n', () => {
  it('pluralises per language', () => {
    expect(translate('en', 'home.summary', { count: 1 })).toBe('1 place open near you');
    expect(translate('en', 'home.summary', { count: 14 })).toBe('14 places open near you');
    expect(translate('da', 'home.summary', { count: 1 })).toBe('1 sted åbent nær dig');
    expect(translate('da', 'home.summary', { count: 3 })).toBe('3 steder åbne nær dig');
  });

  it('picks Danish for Danish browsers and English otherwise', () => {
    expect(detectLang(['da-DK', 'en-US'])).toBe('da');
    expect(detectLang(['en-GB'])).toBe('en');
    expect(detectLang(['de-DE'])).toBe('en');
  });
});
