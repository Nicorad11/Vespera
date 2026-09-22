import type { Place } from '../models/types';

const isApplePlatform = () =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

/** Walking directions: Apple Maps on Apple devices, Google Maps elsewhere. */
export function directionsUrl(place: Place): string {
  const { latitude, longitude } = place.coordinate;
  if (isApplePlatform()) {
    return `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w&q=${encodeURIComponent(place.name)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
}

export function placeUrl(place: Place): string {
  const url = new URL(location.href);
  url.hash = `#/now/place/${encodeURIComponent(place.id)}`;
  url.search = '';
  return url.toString();
}
