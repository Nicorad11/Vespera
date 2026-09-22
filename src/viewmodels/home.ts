import { useCallback, useMemo } from 'react';
import { buildSuggestion } from '../models/suggestions';
import { formatInstantClock } from '../models/time';
import { matchesCategory } from '../models/types';
import { refreshNow, useNow } from './clock';
import { setCategory, setOpenOnly, useCategory, useOpenOnly } from './filters';
import { useI18n } from './i18n';
import { requestLocation, useOrigin } from './location';
import { useSnapshots } from './snapshots';
import { showToast } from './toast';

/** Everything the "Now" screen shows, derived from the clock, location and filters. */
export function useHomeViewModel() {
  const now = useNow();
  const { t } = useI18n();
  const origin = useOrigin();
  const category = useCategory();
  const openOnly = useOpenOnly();
  const snapshots = useSnapshots();

  const inCategory = useMemo(
    () => snapshots.filter((s) => matchesCategory(s.place, category)),
    [snapshots, category],
  );
  const openCount = inCategory.filter((s) => s.status.isOpen).length;
  const visible = openOnly ? inCategory.filter((s) => s.status.isOpen) : inCategory;
  const suggestion = useMemo(() => buildSuggestion(snapshots, now), [snapshots, now]);

  const refresh = useCallback(async () => {
    refreshNow();
    if (origin.status === 'active' || origin.status === 'far') requestLocation();
    showToast(t('toast.updated', { time: formatInstantClock(Date.now()) }));
  }, [origin.status, t]);

  return {
    now,
    clock: formatInstantClock(now),
    category,
    setCategory,
    openOnly,
    setOpenOnly,
    visible,
    openCount,
    hiddenClosedCount: inCategory.length - openCount,
    suggestion,
    origin,
    requestLocation,
    refresh,
  };
}

export type HomeViewModel = ReturnType<typeof useHomeViewModel>;
