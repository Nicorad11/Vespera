import { recordRecent } from './saved';
import { placeById } from './places';
import { createStore, useStore } from './store';

/**
 * Tabs and the place detail overlay, mirrored in the URL hash so links can be
 * shared (#/map/place/cbs-library) and the back button closes the detail.
 */
export type Tab = 'now' | 'map' | 'saved';
export const TABS: readonly Tab[] = ['now', 'map', 'saved'];

export interface DetailRoute {
  id: string;
  /** Shared-layout id of the element the detail grows out of, if any. */
  layoutKey: string | null;
}

interface NavState {
  tab: Tab;
  detail: DetailRoute | null;
}

function parseHash(hash: string): { tab: Tab; detailId: string | null } {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  let index = 0;
  let tab: Tab = 'now';
  if (TABS.includes(parts[0] as Tab)) {
    tab = parts[0] as Tab;
    index = 1;
  }
  const id = parts[index] === 'place' ? parts[index + 1] : undefined;
  const detailId = id && placeById(decodeURIComponent(id)) ? decodeURIComponent(id) : null;
  return { tab, detailId };
}

function hashFor({ tab, detail }: NavState): string {
  return `#/${tab}${detail ? `/place/${encodeURIComponent(detail.id)}` : ''}`;
}

const initial = parseHash(typeof location === 'undefined' ? '' : location.hash);
const nav = createStore<NavState>({
  tab: initial.tab,
  detail: initial.detailId ? { id: initial.detailId, layoutKey: null } : null,
});
if (initial.detailId) recordRecent(initial.detailId);

/** True when the open detail added its own history entry (so Back closes it). */
let detailPushed = false;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const parsed = parseHash(location.hash);
    detailPushed = false;
    nav.set((state) => ({
      tab: parsed.tab,
      detail: parsed.detailId
        ? { id: parsed.detailId, layoutKey: state.detail?.id === parsed.detailId ? state.detail.layoutKey : null }
        : null,
    }));
  });
}

/** Bumped when the active tab is tapped again: views scroll back to the top. */
const scrollToTopSignal = createStore<{ tab: Tab; count: number }>({ tab: 'now', count: 0 });

export function selectTab(tab: Tab): void {
  const state = nav.get();
  if (state.tab === tab && !state.detail) {
    scrollToTopSignal.set(({ count }) => ({ tab, count: count + 1 }));
    return;
  }
  const next: NavState = { tab, detail: null };
  nav.set(next);
  history.replaceState(null, '', hashFor(next));
}

export function openPlace(id: string, layoutKey: string | null = null): void {
  const state = nav.get();
  const next: NavState = { ...state, detail: { id, layoutKey } };
  nav.set(next);
  if (state.detail) {
    history.replaceState(null, '', hashFor(next));
  } else {
    history.pushState(null, '', hashFor(next));
    detailPushed = true;
  }
  recordRecent(id);
}

export function closePlace(): void {
  const state = nav.get();
  if (!state.detail) return;
  const next: NavState = { ...state, detail: null };
  nav.set(next);
  if (detailPushed) {
    detailPushed = false;
    history.back();
  } else {
    history.replaceState(null, '', hashFor(next));
  }
}

export function useNavigation(): NavState {
  return useStore(nav);
}

export function useScrollToTopSignal() {
  return useStore(scrollToTopSignal);
}

/** Asks the map to fly to a place and open its card ("Show on map" in the detail). */
const mapFocus = createStore<{ id: string; count: number } | null>(null);

export function showOnMap(id: string): void {
  const state = nav.get();
  const next: NavState = { tab: 'map', detail: null };
  nav.set(next);
  if (state.detail && detailPushed) {
    detailPushed = false;
    history.back();
    // history.back() restores the previous tab asynchronously; re-apply the map tab after it.
    window.addEventListener('popstate', () => {
      nav.set(next);
      history.replaceState(null, '', hashFor(next));
    }, { once: true });
  } else {
    history.replaceState(null, '', hashFor(next));
  }
  mapFocus.set((previous) => ({ id, count: (previous?.count ?? 0) + 1 }));
}

export function useMapFocus() {
  return useStore(mapFocus);
}
