import { useMemo } from 'react';
import { snapshotPlaces, sortForFeed, type PlaceSnapshot } from '../models/ranking';
import { useNow } from './clock';
import { useI18n } from './i18n';
import { useOrigin } from './location';
import { PLACES } from './places';

/** Every place evaluated for the current minute and origin, in feed order. */
export function useSnapshots(): PlaceSnapshot[] {
  const now = useNow();
  const { lang } = useI18n();
  const { origin } = useOrigin();
  return useMemo(() => sortForFeed(snapshotPlaces(PLACES, now, origin, lang)), [now, origin, lang]);
}
