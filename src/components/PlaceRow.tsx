import { Footprints, Plug, Wifi } from 'lucide-react';
import type { PlaceSnapshot } from '../models/ranking';
import { primaryCategory } from '../models/types';
import { useI18n } from '../viewmodels/i18n';
import { CategoryIcon } from './CategoryIcon';
import { StatusPill } from './StatusPill';
import './PlaceRow.css';

interface Props {
  snapshot: PlaceSnapshot;
  compact?: boolean;
}

/** Name, status pill, walking time, price and amenity icons: the core row used everywhere. */
export function PlaceRow({ snapshot, compact = false }: Props) {
  const { t } = useI18n();
  const { place, display, walkingMinutes, status } = snapshot;
  const price = place.cheapestItem
    ? t('place.priceFrom', { price: place.cheapestItem.price })
    : t(place.priceLevel === 1 ? 'price.1' : place.priceLevel === 2 ? 'price.2' : 'price.3');

  return (
    <div className={`place-row${compact ? ' place-row--compact' : ''}`}>
      <CategoryIcon category={primaryCategory(place)} size={compact ? 'sm' : 'md'} dimmed={!status.isOpen} />
      <div className="place-row__body">
        <h3 className="place-row__name">{place.name}</h3>
        <div className="place-row__line">
          <StatusPill display={display} size={compact ? 'sm' : 'md'} />
          {compact && (
            <span className="place-row__walk tabular">
              <Footprints aria-hidden /> {t('place.walkShort', { minutes: walkingMinutes })}
            </span>
          )}
        </div>
        {!compact && (
          <ul className="place-row__meta">
            <li className="tabular">
              <Footprints aria-hidden />
              {t('place.walk', { minutes: walkingMinutes })}
            </li>
            <li className="tabular">{price}</li>
            {place.hasOutlets && (
              <li className="place-row__amenity" title={t('place.outlets')}>
                <Plug aria-hidden />
                <span className="visually-hidden">{t('place.outlets')}</span>
              </li>
            )}
            {place.wifi && (
              <li className="place-row__amenity" title={t('place.wifi')}>
                <Wifi aria-hidden />
                <span className="visually-hidden">{t('place.wifi')}</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
