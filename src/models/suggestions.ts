import type { PlaceSnapshot } from './ranking';
import { CPH_TIME_ZONE, minutesOfDay, toZoned } from './time';
import type { Category, NoiseLevel } from './types';

/** The "Right now" card changes with the time of day. */
export type SuggestionKind = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'lateNight';

export interface Suggestion {
  kind: SuggestionKind;
  /** Up to three places that fit the moment, best first. */
  picks: PlaceSnapshot[];
  /** When nothing fits: whichever relevant place opens first. */
  nextOpening: PlaceSnapshot | null;
}

/** An affordable meal, the definition behind the Food category. */
export const CHEAP_MEAL_DKK = 75;

const MAX_PICKS = 3;

export function suggestionKind(now: number, timeZone = CPH_TIME_ZONE): SuggestionKind {
  const minutes = minutesOfDay(toZoned(now, timeZone));
  if (minutes >= 5 * 60 && minutes < 11 * 60) return 'morning';
  if (minutes >= 11 * 60 && minutes < 14 * 60 + 30) return 'lunch';
  if (minutes >= 14 * 60 + 30 && minutes < 17 * 60 + 30) return 'afternoon';
  if (minutes >= 17 * 60 + 30 && minutes < 22 * 60) return 'evening';
  return 'lateNight';
}

const RELEVANT_CATEGORY: Record<SuggestionKind, Category> = {
  morning: 'study',
  lunch: 'food',
  afternoon: 'study',
  evening: 'food',
  lateNight: 'lateNight',
};

const NOISE_RANK: Record<NoiseLevel, number> = { quiet: 0, medium: 1, lively: 2 };

const byDistance = (a: PlaceSnapshot, b: PlaceSnapshot) => a.distance - b.distance;
const cheapestPrice = (s: PlaceSnapshot) => s.place.cheapestItem?.price ?? Number.POSITIVE_INFINITY;
const closesAt = (s: PlaceSnapshot) =>
  s.status.isOpen ? (s.status.until ?? Number.POSITIVE_INFINITY) : Number.NEGATIVE_INFINITY;
const isIn = (category: Category) => (s: PlaceSnapshot) => s.place.categories.includes(category);

function pickFor(kind: SuggestionKind, open: PlaceSnapshot[]): PlaceSnapshot[] {
  switch (kind) {
    case 'morning': {
      const coffee = open.filter((s) => s.place.tags.includes('coffee')).sort(byDistance)[0];
      const desk = open
        .filter((s) => isIn('study')(s) && s.place.hasOutlets && s.place.id !== coffee?.place.id)
        .sort(byDistance)[0];
      return [coffee, desk].filter((s): s is PlaceSnapshot => s !== undefined);
    }
    case 'lunch':
      return open
        .filter(isIn('food'))
        .sort((a, b) => cheapestPrice(a) - cheapestPrice(b) || byDistance(a, b))
        .slice(0, MAX_PICKS);
    case 'afternoon':
      return open
        .filter((s) => isIn('study')(s) && s.place.hasOutlets)
        .sort((a, b) => NOISE_RANK[a.place.noiseLevel] - NOISE_RANK[b.place.noiseLevel] || byDistance(a, b))
        .slice(0, MAX_PICKS);
    case 'evening':
      return open
        .filter((s) => isIn('food')(s) && cheapestPrice(s) <= CHEAP_MEAL_DKK)
        .sort(byDistance)
        .slice(0, MAX_PICKS);
    case 'lateNight':
      return open
        .filter(isIn('lateNight'))
        .sort((a, b) => closesAt(b) - closesAt(a) || byDistance(a, b))
        .slice(0, MAX_PICKS);
  }
}

function firstToOpen(snapshots: readonly PlaceSnapshot[]): PlaceSnapshot | null {
  let best: PlaceSnapshot | null = null;
  let bestTime = Number.POSITIVE_INFINITY;
  for (const s of snapshots) {
    if (!s.status.isOpen && s.status.opensAt !== null && s.status.opensAt < bestTime) {
      best = s;
      bestTime = s.status.opensAt;
    }
  }
  return best;
}

export function buildSuggestion(
  snapshots: readonly PlaceSnapshot[],
  now: number,
  timeZone = CPH_TIME_ZONE,
): Suggestion {
  const kind = suggestionKind(now, timeZone);
  const picks = pickFor(
    kind,
    snapshots.filter((s) => s.status.isOpen),
  );
  if (picks.length > 0) return { kind, picks, nextOpening: null };

  const relevant = snapshots.filter(isIn(RELEVANT_CATEGORY[kind]));
  return { kind, picks, nextOpening: firstToOpen(relevant) ?? firstToOpen(snapshots) };
}
