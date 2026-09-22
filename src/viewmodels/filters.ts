import { CATEGORIES, type CategoryFilter } from '../models/types';
import { haptic } from '../services/haptics';
import { createStore, useStore } from './store';

function initialCategory(): CategoryFilter {
  if (typeof location === 'undefined') return 'all';
  // Home-screen shortcuts open e.g. ./?category=food
  const requested = new URLSearchParams(location.search).get('category');
  return CATEGORIES.includes(requested as never) ? (requested as CategoryFilter) : 'all';
}

/** Shared by Home and Map so switching tabs keeps the same filter. */
const categoryStore = createStore<CategoryFilter>(initialCategory());
const openOnlyStore = createStore(true);

export function useCategory(): CategoryFilter {
  return useStore(categoryStore);
}

export function setCategory(category: CategoryFilter): void {
  if (category === categoryStore.get()) return;
  haptic('light');
  categoryStore.set(category);
}

export function useOpenOnly(): boolean {
  return useStore(openOnlyStore);
}

export function setOpenOnly(value: boolean): void {
  haptic('selection');
  openOnlyStore.set(value);
}
