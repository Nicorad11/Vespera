import { useEffect, useRef, useState, type RefObject } from 'react';
import { haptic } from '../services/haptics';
import { useScrollToTopSignal, type Tab } from '../viewmodels/navigation';

/**
 * Writes scroll progress (0…1 over `distance` px) to the `--collapse` CSS
 * variable on the scroll container every frame, without re-rendering React.
 * Returns whether the header is collapsed, which only changes at the threshold.
 */
export function useCollapsingHeader(ref: RefObject<HTMLElement | null>, distance: number): boolean {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, el.scrollTop / distance));
      el.style.setProperty('--collapse', progress.toFixed(3));
      setCollapsed(progress > 0.85);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ref, distance]);
  return collapsed;
}

export type PullState = 'idle' | 'pulling' | 'armed' | 'refreshing';

const PULL_THRESHOLD = 70;
const MIN_SPINNER_MS = 650;

/**
 * Touch pull-to-refresh on a scroll container. The pull distance goes to the
 * `--pull` / `--pull-progress` CSS variables; React only re-renders when the
 * state changes (armed, refreshing…).
 */
export function usePullToRefresh(ref: RefObject<HTMLElement | null>, onRefresh: () => void | Promise<void>): PullState {
  const [state, setState] = useState<PullState>('idle');
  const refreshing = useRef(false);
  const callback = useRef(onRefresh);
  useEffect(() => {
    callback.current = onRefresh;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startY: number | null = null;
    let pull = 0;

    const setPull = (value: number) => {
      pull = value;
      el.style.setProperty('--pull', `${value}px`);
      el.style.setProperty('--pull-progress', (value / PULL_THRESHOLD).toFixed(3));
    };

    const onStart = (event: TouchEvent) => {
      if (refreshing.current || el.scrollTop > 0) return;
      startY = event.touches[0]?.clientY ?? null;
    };
    const onMove = (event: TouchEvent) => {
      if (startY === null) return;
      const dy = (event.touches[0]?.clientY ?? startY) - startY;
      if (dy <= 0 || el.scrollTop > 0) {
        setPull(0);
        setState('idle');
        return;
      }
      const resisted = Math.min(PULL_THRESHOLD * 1.6, dy * 0.5);
      const wasArmed = pull >= PULL_THRESHOLD;
      setPull(resisted);
      const armed = resisted >= PULL_THRESHOLD;
      if (armed && !wasArmed) haptic('selection');
      setState(armed ? 'armed' : 'pulling');
    };
    const onEnd = async () => {
      if (startY === null) return;
      startY = null;
      if (pull >= PULL_THRESHOLD) {
        refreshing.current = true;
        setState('refreshing');
        setPull(0);
        await Promise.all([callback.current(), new Promise((r) => setTimeout(r, MIN_SPINNER_MS))]);
        refreshing.current = false;
      }
      setPull(0);
      setState('idle');
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [ref]);

  return state;
}

/** Scrolls the view back to the top when its tab is tapped again. */
export function useScrollToTop(ref: RefObject<HTMLElement | null>, tab: Tab): void {
  const signal = useScrollToTopSignal();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (signal.tab !== tab) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [signal, tab, ref]);
}
