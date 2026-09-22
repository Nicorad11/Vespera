import type { OpeningHours } from './openingHours';
import type { Coordinate } from './geo';

/** The three things students look for. A place can belong to several. */
export type Category = 'food' | 'study' | 'lateNight';
export const CATEGORIES: readonly Category[] = ['food', 'study', 'lateNight'];

/** Filter value used by the segmented control: a category or everything. */
export type CategoryFilter = Category | 'all';

export type Campus = 'solbjergPlads' | 'porcelaenshaven' | 'kilen' | 'dalgasHave' | 'howitzvej';
export const CAMPUSES: readonly Campus[] = [
  'solbjergPlads',
  'porcelaenshaven',
  'kilen',
  'dalgasHave',
  'howitzvej',
];

/** Campus names are proper nouns, so they are not translated. */
export const CAMPUS_NAMES: Record<Campus, string> = {
  solbjergPlads: 'Solbjerg Plads',
  porcelaenshaven: 'Porcelænshaven',
  kilen: 'Kilen',
  dalgasHave: 'Dalgas Have',
  howitzvej: 'Howitzvej',
};

export type NoiseLevel = 'quiet' | 'medium' | 'lively';
export const NOISE_LEVELS: readonly NoiseLevel[] = ['quiet', 'medium', 'lively'];

export type PriceLevel = 1 | 2 | 3;

export interface MenuItem {
  name: string;
  /** Price in DKK. */
  price: number;
}

export interface Place {
  id: string;
  name: string;
  /** First entry is the primary category (drives the icon and accent colour). */
  categories: Category[];
  campus: Campus;
  coordinate: Coordinate;
  address: string;
  openingHours: OpeningHours;
  priceLevel: PriceLevel;
  cheapestItem: MenuItem | null;
  hasOutlets: boolean;
  wifi: boolean;
  noiseLevel: NoiseLevel;
  studentDiscount: string | null;
  tags: string[];
  /** `false` for placeholder seed data that nobody has checked on site yet. */
  verified: boolean;
}

export function primaryCategory(place: Place): Category {
  return place.categories[0] ?? 'food';
}

export function matchesCategory(place: Place, filter: CategoryFilter): boolean {
  return filter === 'all' || place.categories.includes(filter);
}
