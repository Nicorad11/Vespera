import type { Lang } from '../i18n/translate';
import { distanceMeters, walkingMinutes, type Coordinate } from './geo';
import { describeStatus, statusAt, type OpenStatus, type StatusDisplay } from './status';
import { CPH_TIME_ZONE } from './time';
import type { Place } from './types';

/** A place evaluated at one moment from one origin: everything a row needs. */
export interface PlaceSnapshot {
  place: Place;
  status: OpenStatus;
  display: StatusDisplay;
  /** Metres from the origin (user or campus). */
  distance: number;
  walkingMinutes: number;
}

export function snapshotPlace(
  place: Place,
  now: number,
  origin: Coordinate,
  lang: Lang,
  timeZone = CPH_TIME_ZONE,
): PlaceSnapshot {
  const status = statusAt(place.openingHours, now, timeZone);
  const distance = distanceMeters(origin, place.coordinate);
  return {
    place,
    status,
    display: describeStatus(status, now, lang, timeZone),
    distance,
    walkingMinutes: walkingMinutes(distance),
  };
}

export function snapshotPlaces(
  places: readonly Place[],
  now: number,
  origin: Coordinate,
  lang: Lang,
  timeZone = CPH_TIME_ZONE,
): PlaceSnapshot[] {
  return places.map((place) => snapshotPlace(place, now, origin, lang, timeZone));
}

/** Default order: open places first, then by walking distance, then by name. */
export function compareForFeed(a: PlaceSnapshot, b: PlaceSnapshot): number {
  if (a.status.isOpen !== b.status.isOpen) return a.status.isOpen ? -1 : 1;
  return a.distance - b.distance || a.place.name.localeCompare(b.place.name);
}

export function sortForFeed(snapshots: readonly PlaceSnapshot[]): PlaceSnapshot[] {
  return [...snapshots].sort(compareForFeed);
}
