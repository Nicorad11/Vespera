import { readJSON, writeJSON } from '../services/storage';
import { createStore, useStore } from './store';

/**
 * Favorites and recently viewed places, kept on the device in localStorage.
 * Only place ids are stored, so edits to places.json show up immediately.
 */
export interface SavedEntry {
  id: string;
  at: number;
}

const FAVORITES_KEY = 'vespera.favorites.v1';
const RECENTS_KEY = 'vespera.recents.v1';
const MAX_RECENTS = 12;

const isEntries = (value: unknown): value is SavedEntry[] =>
  Array.isArray(value) &&
  value.every((e) => typeof e === 'object' && e !== null && typeof e.id === 'string' && typeof e.at === 'number');

const favorites = createStore<SavedEntry[]>(readJSON(FAVORITES_KEY, [], isEntries));
const recents = createStore<SavedEntry[]>(readJSON(RECENTS_KEY, [], isEntries));

favorites.subscribe(() => writeJSON(FAVORITES_KEY, favorites.get()));
recents.subscribe(() => writeJSON(RECENTS_KEY, recents.get()));

// Keep several open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === FAVORITES_KEY) favorites.set(readJSON(FAVORITES_KEY, [], isEntries));
    if (event.key === RECENTS_KEY) recents.set(readJSON(RECENTS_KEY, [], isEntries));
  });
}

/** Toggles a favorite and returns whether the place is now saved. */
export function toggleFavorite(id: string): boolean {
  const saved = favorites.get().some((e) => e.id === id);
  favorites.set((list) => (saved ? list.filter((e) => e.id !== id) : [{ id, at: Date.now() }, ...list]));
  return !saved;
}

export function recordRecent(id: string): void {
  recents.set((list) => [{ id, at: Date.now() }, ...list.filter((e) => e.id !== id)].slice(0, MAX_RECENTS));
}

export function clearRecents(): void {
  recents.set([]);
}

export function useFavorites(): SavedEntry[] {
  return useStore(favorites);
}

export function useRecents(): SavedEntry[] {
  return useStore(recents);
}

export function useIsFavorite(id: string): boolean {
  return useStore(favorites).some((e) => e.id === id);
}
