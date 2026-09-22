import { MINUTE_MS } from '../models/time';
import { createStore, useStore } from './store';

/**
 * The app's notion of "now". It ticks on every minute boundary so status
 * pills and the open count update live, and re-syncs when the tab becomes
 * visible again or the user pulls to refresh.
 */
const clock = createStore(Date.now());
let timer: number | undefined;

function scheduleTick() {
  window.clearTimeout(timer);
  const untilNextMinute = MINUTE_MS - (Date.now() % MINUTE_MS) + 20;
  timer = window.setTimeout(() => {
    clock.set(Date.now());
    scheduleTick();
  }, untilNextMinute);
}

export function startClock(): void {
  scheduleTick();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshNow();
  });
}

export function refreshNow(): void {
  clock.set(Date.now());
  scheduleTick();
}

export function useNow(): number {
  return useStore(clock);
}
