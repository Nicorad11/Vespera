import { distanceMeters, MAX_USEFUL_DISTANCE_M, SOLBJERG_PLADS, type Coordinate } from '../models/geo';
import { createStore, useStore } from './store';

/**
 * Where walking times are measured from. We never prompt on launch: until
 * the user taps "Use my location" (or has already granted permission) the
 * origin is CBS Solbjerg Plads, so the first screen still answers instantly.
 */
export type LocationStatus = 'idle' | 'locating' | 'active' | 'denied' | 'unavailable' | 'far';

interface LocationState {
  status: LocationStatus;
  coordinate: Coordinate | null;
}

/** Ignore GPS jitter below this, so the feed doesn't reshuffle while standing still. */
const MIN_MOVE_M = 15;

const store = createStore<LocationState>({ status: 'idle', coordinate: null });
let watchId: number | null = null;

export function requestLocation(): void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    store.set({ status: 'unavailable', coordinate: null });
    return;
  }
  if (watchId !== null) return;
  store.set((s) => ({ ...s, status: s.coordinate ? s.status : 'locating' }));
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const previous = store.get().coordinate;
      if (previous && distanceMeters(previous, next) < MIN_MOVE_M) return;
      const far = distanceMeters(next, SOLBJERG_PLADS) > MAX_USEFUL_DISTANCE_M;
      store.set({ status: far ? 'far' : 'active', coordinate: next });
    },
    (error) => {
      const denied = error.code === error.PERMISSION_DENIED;
      store.set({ status: denied ? 'denied' : 'unavailable', coordinate: null });
      if (denied && watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    },
    { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
  );
}

/** Starts watching right away only if the user already granted permission. */
export async function initLocation(): Promise<void> {
  try {
    const permission = await navigator.permissions?.query({ name: 'geolocation' });
    if (permission?.state === 'granted') requestLocation();
    else if (permission?.state === 'denied') store.set({ status: 'denied', coordinate: null });
  } catch {
    // Permissions API missing (older Safari): wait for the user to opt in.
  }
}

export interface Origin {
  origin: Coordinate;
  /** True when distances are measured from the user rather than campus. */
  fromUser: boolean;
  status: LocationStatus;
  coordinate: Coordinate | null;
}

export function useOrigin(): Origin {
  const { status, coordinate } = useStore(store);
  const fromUser = status === 'active' && coordinate !== null;
  return { origin: fromUser ? coordinate : SOLBJERG_PLADS, fromUser, status, coordinate };
}
