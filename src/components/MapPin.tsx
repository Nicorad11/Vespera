import type { PlaceSnapshot } from '../models/ranking';
import { primaryCategory } from '../models/types';
import { categoryMeta } from './categoryMeta';
import './MapPin.css';

/** Vertical distance from the marker's anchor (tip) to the centre of the bubble. */
export const PIN_BUBBLE_OFFSET = 28;

interface Props {
  snapshot: PlaceSnapshot;
  filtered: boolean;
  selected: boolean;
}

/** Glass pin coloured by category; closed places are dimmed. Rendered into a Leaflet marker. */
export function MapPin({ snapshot, filtered, selected }: Props) {
  const category = primaryCategory(snapshot.place);
  const { icon: Icon } = categoryMeta(category);
  const state = [
    snapshot.status.isOpen ? '' : 'is-closed',
    snapshot.display.tone === 'closingSoon' ? 'is-closing' : '',
    filtered ? 'is-filtered' : '',
    selected ? 'is-selected' : '',
  ].join(' ');
  return (
    <div className={`map-pin map-pin--${category} ${state}`}>
      <span className="map-pin__bubble">
        <Icon strokeWidth={2.4} aria-hidden />
      </span>
      <span className="map-pin__tip" />
    </div>
  );
}

/** Just the bubble, used as the start and end of the pin → card morph. */
export function PinBubble({ snapshot }: { snapshot: PlaceSnapshot }) {
  const category = primaryCategory(snapshot.place);
  const { icon: Icon } = categoryMeta(category);
  return (
    <span className={`map-pin__bubble map-pin--${category}`}>
      <Icon strokeWidth={2.4} aria-hidden />
    </span>
  );
}
