import { parsePlaces } from '../models/places';
import type { Place } from '../models/types';
import raw from '../resources/places.json';

const result = parsePlaces(raw);
if (result.errors.length > 0) {
  console.error(`places.json has ${result.errors.length} problem(s):\n${result.errors.join('\n')}`);
}

/** All valid places from the bundled `places.json`, parsed once at startup. */
export const PLACES: readonly Place[] = result.places;
export const PLACE_DATA_ERRORS: readonly string[] = result.errors;

const byId = new Map(PLACES.map((place) => [place.id, place]));
export function placeById(id: string): Place | undefined {
  return byId.get(id);
}
