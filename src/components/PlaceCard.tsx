import type { Ref } from 'react';
import type { PlaceSnapshot } from '../models/ranking';
import { primaryCategory } from '../models/types';
import { useI18n } from '../viewmodels/i18n';
import { openPlace } from '../viewmodels/navigation';
import { categoryMeta } from './categoryMeta';
import { GlassCard } from './GlassCard';
import { spring } from './motion';
import { PlaceRow } from './PlaceRow';
import { SaveButton } from './SaveButton';
import './PlaceCard.css';

interface Props {
  snapshot: PlaceSnapshot;
  /** Shared-layout id; the detail view grows out of this card. */
  layoutKey: string;
  ref?: Ref<HTMLLIElement>;
}

/** A feed card: tap anywhere for details, heart to save. */
export function PlaceCard({ snapshot, layoutKey, ref }: Props) {
  const { t } = useI18n();
  const { place } = snapshot;
  return (
    <GlassCard
      as="li"
      ref={ref as Ref<HTMLDivElement>}
      layoutId={layoutKey}
      className={`place-card${snapshot.status.isOpen ? '' : ' is-closed'}`}
      tint={categoryMeta(primaryCategory(place)).color}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={spring}
    >
      <button
        type="button"
        className="place-card__hit"
        aria-label={t('a11y.openDetails', { name: place.name })}
        onClick={() => openPlace(place.id, layoutKey)}
      />
      <PlaceRow snapshot={snapshot} />
      <SaveButton placeId={place.id} name={place.name} className="place-card__save" />
    </GlassCard>
  );
}
