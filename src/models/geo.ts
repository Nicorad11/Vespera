export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** CBS main campus. Used as the origin when the user's location is unknown. */
export const SOLBJERG_PLADS: Coordinate = { latitude: 55.6816, longitude: 12.5303 };

/** Farther than this from CBS and we assume the location isn't useful for walking times. */
export const MAX_USEFUL_DISTANCE_M = 15_000;

/** Average walking pace used for time estimates (no routing in v1). */
export const WALKING_METERS_PER_MINUTE = 80;

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Walking time in whole minutes, rounded up, never less than 1. */
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.ceil(meters / WALKING_METERS_PER_MINUTE));
}

export function formatDistance(meters: number, locale: string): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(meters / 1000);
  return `${km} km`;
}
