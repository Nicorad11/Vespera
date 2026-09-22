import { DAY_KEYS, parseTimeRange, type DayKey, type OpeningHours, type TimeRange } from './openingHours';
import {
  CAMPUSES,
  CATEGORIES,
  NOISE_LEVELS,
  type Campus,
  type Category,
  type MenuItem,
  type NoiseLevel,
  type Place,
  type PriceLevel,
} from './types';

/**
 * Parses `places.json`. Invalid places are skipped and every problem is
 * reported with the place id and field, so editors see exactly what to fix.
 * The unit tests fail on any error, so a broken edit never ships.
 */
export interface ParseResult {
  places: Place[];
  errors: string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOURS_KEYS = new Set<string>([...DAY_KEYS, 'holidays']);

class Problems {
  readonly list: string[] = [];
  constructor(private readonly label: string) {}
  add(message: string) {
    this.list.push(`${this.label}: ${message}`);
  }
}

function parseRanges(value: unknown, field: string, problems: Problems): TimeRange[] {
  if (!Array.isArray(value)) {
    problems.add(`openingHours.${field} must be a list like ["08:00-16:00"]`);
    return [];
  }
  const ranges: TimeRange[] = [];
  for (const item of value) {
    const range = typeof item === 'string' ? parseTimeRange(item) : null;
    if (range) ranges.push(range);
    else problems.add(`openingHours.${field} has an invalid range ${JSON.stringify(item)} (use "HH:MM-HH:MM")`);
  }
  return ranges;
}

function parseOpeningHours(value: unknown, problems: Problems): OpeningHours {
  const weekly = Object.fromEntries(DAY_KEYS.map((day) => [day, [] as TimeRange[]])) as Record<DayKey, TimeRange[]>;
  if (!isObject(value)) {
    problems.add('openingHours must be an object with keys mon…sun');
    return { weekly, holidays: null };
  }
  for (const key of Object.keys(value)) {
    if (!HOURS_KEYS.has(key)) problems.add(`openingHours has unknown key "${key}" (use mon, tue, wed, thu, fri, sat, sun, holidays)`);
  }
  for (const day of DAY_KEYS) {
    if (value[day] !== undefined) weekly[day] = parseRanges(value[day], day, problems);
  }
  const holidays = value.holidays === undefined || value.holidays === null
    ? null
    : parseRanges(value.holidays, 'holidays', problems);
  return { weekly, holidays };
}

function parseMenuItem(value: unknown, problems: Problems): MenuItem | null {
  if (value === undefined || value === null) return null;
  if (isObject(value) && typeof value.name === 'string' && value.name.trim() && typeof value.price === 'number' && value.price >= 0) {
    return { name: value.name, price: value.price };
  }
  problems.add('cheapestItem must be null or { "name": string, "price": number }');
  return null;
}

function parsePlace(raw: unknown, index: number): { place: Place | null; errors: string[] } {
  const label = isObject(raw) && typeof raw.id === 'string' ? `"${raw.id}"` : `place #${index + 1}`;
  const problems = new Problems(label);
  if (!isObject(raw)) {
    problems.add('must be an object');
    return { place: null, errors: problems.list };
  }

  const text = (key: string): string => {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value;
    problems.add(`${key} must be a non-empty string`);
    return '';
  };
  const flag = (key: string): boolean => {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
    problems.add(`${key} must be true or false`);
    return false;
  };
  const oneOf = <T extends string>(key: string, allowed: readonly T[]): T => {
    const value = raw[key];
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
    problems.add(`${key} must be one of ${allowed.join(', ')}`);
    return allowed[0] as T;
  };

  const id = text('id');
  if (id && !ID_PATTERN.test(id)) problems.add('id must be lowercase letters, digits and dashes (e.g. "kilen-cafe")');

  const categories: Category[] = [];
  if (Array.isArray(raw.categories) && raw.categories.length > 0) {
    for (const c of raw.categories) {
      if (typeof c === 'string' && (CATEGORIES as readonly string[]).includes(c)) {
        if (!categories.includes(c as Category)) categories.push(c as Category);
      } else {
        problems.add(`categories contains ${JSON.stringify(c)} (use food, study, lateNight)`);
      }
    }
  } else {
    problems.add('categories must list at least one of food, study, lateNight');
  }

  const coordinate = raw.coordinate;
  let latitude = 0;
  let longitude = 0;
  if (
    isObject(coordinate) &&
    typeof coordinate.latitude === 'number' &&
    typeof coordinate.longitude === 'number' &&
    Math.abs(coordinate.latitude) <= 90 &&
    Math.abs(coordinate.longitude) <= 180
  ) {
    latitude = coordinate.latitude;
    longitude = coordinate.longitude;
  } else {
    problems.add('coordinate must be { "latitude": number, "longitude": number }');
  }

  const priceLevel = raw.priceLevel;
  if (priceLevel !== 1 && priceLevel !== 2 && priceLevel !== 3) problems.add('priceLevel must be 1, 2 or 3');

  const studentDiscount = raw.studentDiscount;
  if (studentDiscount !== undefined && studentDiscount !== null && typeof studentDiscount !== 'string') {
    problems.add('studentDiscount must be a string or null');
  }

  const tags = raw.tags ?? [];
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) problems.add('tags must be a list of strings');

  const verified = raw.verified === undefined ? false : flag('verified');

  const place: Place = {
    id,
    name: text('name'),
    categories,
    campus: oneOf<Campus>('campus', CAMPUSES),
    coordinate: { latitude, longitude },
    address: text('address'),
    openingHours: parseOpeningHours(raw.openingHours, problems),
    priceLevel: (priceLevel === 2 || priceLevel === 3 ? priceLevel : 1) as PriceLevel,
    cheapestItem: parseMenuItem(raw.cheapestItem, problems),
    hasOutlets: flag('hasOutlets'),
    wifi: flag('wifi'),
    noiseLevel: oneOf<NoiseLevel>('noiseLevel', NOISE_LEVELS),
    studentDiscount: typeof studentDiscount === 'string' && studentDiscount.trim() ? studentDiscount : null,
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
    verified,
  };
  return { place: problems.list.length === 0 ? place : null, errors: problems.list };
}

export function parsePlaces(json: unknown): ParseResult {
  const list = isObject(json) ? json.places : json;
  if (!Array.isArray(list)) {
    return { places: [], errors: ['places.json must contain { "places": [ … ] }'] };
  }

  const places: Place[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  list.forEach((raw, index) => {
    const result = parsePlace(raw, index);
    errors.push(...result.errors);
    if (!result.place) return;
    if (seen.has(result.place.id)) {
      errors.push(`"${result.place.id}": id is used more than once`);
      return;
    }
    seen.add(result.place.id);
    places.push(result.place);
  });
  return { places, errors };
}
