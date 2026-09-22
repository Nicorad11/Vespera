import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronRight, LocateFixed, Navigation, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BottomSheet, type Detent } from '../components/BottomSheet';
import { CategoryFilterBar } from '../components/CategoryFilterBar';
import { MapPin, PIN_BUBBLE_OFFSET, PinBubble } from '../components/MapPin';
import { PlaceRow } from '../components/PlaceRow';
import { SaveButton } from '../components/SaveButton';
import { SOLBJERG_PLADS } from '../models/geo';
import type { PlaceSnapshot } from '../models/ranking';
import { matchesCategory } from '../models/types';
import { directionsUrl } from '../services/directions';
import { haptic } from '../services/haptics';
import { setCategory, useCategory } from '../viewmodels/filters';
import { useI18n } from '../viewmodels/i18n';
import { requestLocation, useOrigin } from '../viewmodels/location';
import { openPlace, useMapFocus } from '../viewmodels/navigation';
import { PLACES, placeById } from '../viewmodels/places';
import { useSnapshots } from '../viewmodels/snapshots';
import './MapView.css';

const tileUrl = (dark: boolean) =>
  `https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`;
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** The pin → card morph runs through three stages: ghost bubble, card, ghost again. */
interface Selection {
  id: string;
  x: number;
  y: number;
  stage: 'ghost' | 'card' | 'closing';
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function MapView({ active }: { active: boolean }) {
  const { t } = useI18n();
  const snapshots = useSnapshots();
  const category = useCategory();
  const origin = useOrigin();
  const focus = useMapFocus();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const hostsRef = useRef<Record<string, HTMLElement>>({});
  const [hosts, setHosts] = useState<Record<string, HTMLElement>>({});
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [detent, setDetent] = useState<Detent>('peek');
  const [wantsLocation, setWantsLocation] = useState(false);
  const fittedOnce = useRef(false);

  const selectionRef = useRef(selection);
  const categoryRef = useRef(category);
  useEffect(() => {
    selectionRef.current = selection;
    categoryRef.current = category;
  });

  const byId = useMemo(() => new Map(snapshots.map((s) => [s.place.id, s])), [snapshots]);
  const inView = useMemo(
    () =>
      bounds
        ? snapshots.filter(
            (s) =>
              matchesCategory(s.place, category) &&
              bounds.contains([s.place.coordinate.latitude, s.place.coordinate.longitude]),
          )
        : [],
    [snapshots, category, bounds],
  );
  const openInView = inView.filter((s) => s.status.isOpen).length;

  /** Where a place's pin bubble currently sits, in map-container pixels. */
  const bubblePoint = useCallback((id: string) => {
    const map = mapRef.current;
    const place = placeById(id);
    if (!map || !place) return { x: 0, y: 0 };
    const point = map.latLngToContainerPoint([place.coordinate.latitude, place.coordinate.longitude]);
    return { x: point.x, y: point.y - PIN_BUBBLE_OFFSET };
  }, []);

  const openCard = useCallback(
    (id: string) => {
      haptic('light');
      setSelection({ id, ...bubblePoint(id), stage: 'ghost' });
    },
    [bubblePoint],
  );

  const closeCard = useCallback(() => {
    const current = selectionRef.current;
    if (!current) return;
    if (current.stage !== 'card') {
      setSelection(null);
      return;
    }
    setSelection({ ...current, ...bubblePoint(current.id), stage: 'closing' });
  }, [bubblePoint]);

  const expandGhost = useCallback(
    () => setSelection((s) => (s && s.stage === 'ghost' ? { ...s, stage: 'card' } : s)),
    [],
  );
  const finishCollapse = useCallback(() => setSelection((s) => (s && s.stage === 'closing' ? null : s)), []);

  const openCardRef = useRef(openCard);
  const closeCardRef = useRef(closeCard);
  useEffect(() => {
    openCardRef.current = openCard;
    closeCardRef.current = closeCard;
  });

  // Create the Leaflet map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const map = L.map(container, {
      center: [SOLBJERG_PLADS.latitude, SOLBJERG_PLADS.longitude],
      zoom: 15,
      minZoom: 12,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.25,
    });
    L.control.attribution({ position: 'topleft', prefix: false }).addTo(map);
    const tiles = L.tileLayer(tileUrl(dark.matches), {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    const onTheme = () => tiles.setUrl(tileUrl(dark.matches));
    dark.addEventListener('change', onTheme);

    const updateBounds = () => setBounds(map.getBounds());
    map.on('moveend', updateBounds);
    // Smaller pins when zoomed out, so dense areas stay readable.
    const updateZoomClass = () => container.classList.toggle('is-zoomed-out', map.getZoom() < 15.5);
    map.on('zoomend', updateZoomClass);
    updateZoomClass();
    map.on('click', () => closeCardRef.current());

    // One marker per place; React renders the pin into each marker element.
    const markers = PLACES.map((place) => {
      const marker = L.marker([place.coordinate.latitude, place.coordinate.longitude], {
        icon: L.divIcon({ className: 'pin-marker', html: '', iconSize: [44, 50], iconAnchor: [22, 50] }),
        title: place.name,
        riseOnHover: true,
        keyboard: true,
      }).addTo(map);
      marker.on('click', () => {
        if (matchesCategory(place, categoryRef.current)) openCardRef.current(place.id);
      });
      const element = marker.getElement();
      if (element) {
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', place.name);
        hostsRef.current[place.id] = element;
      }
      return marker;
    });
    setHosts({ ...hostsRef.current });
    mapRef.current = map;

    return () => {
      dark.removeEventListener('change', onTheme);
      markers.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Leaflet can't measure a hidden container: re-measure when the tab shows.
  useEffect(() => {
    const map = mapRef.current;
    if (!active || !map) return;
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
      if (!fittedOnce.current) {
        fittedOnce.current = true;
        const all = L.latLngBounds(PLACES.map((p) => [p.coordinate.latitude, p.coordinate.longitude]));
        map.fitBounds(all, { paddingTopLeft: [24, 110], paddingBottomRight: [24, 200], animate: false });
      }
      setBounds(map.getBounds());
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  // Filtered-out pins shouldn't catch clicks or keyboard focus.
  useEffect(() => {
    for (const [id, element] of Object.entries(hosts)) {
      const place = placeById(id);
      const filtered = !place || !matchesCategory(place, category);
      element.classList.toggle('is-filtered', filtered);
      element.tabIndex = filtered ? -1 : 0;
    }
  }, [hosts, category]);

  // Changing the filter closes a card that no longer matches.
  useEffect(() => {
    const current = selectionRef.current;
    const place = current ? placeById(current.id) : undefined;
    if (place && !matchesCategory(place, category)) closeCardRef.current();
  }, [category]);

  // The user's own position.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin.coordinate) return;
    const marker = L.marker([origin.coordinate.latitude, origin.coordinate.longitude], {
      icon: L.divIcon({ className: 'user-dot-marker', html: '<span class="user-dot"></span>', iconSize: [18, 18] }),
      interactive: false,
      keyboard: false,
      zIndexOffset: -1000,
    }).addTo(map);
    return () => {
      marker.remove();
    };
  }, [origin.coordinate]);

  // After "Show my location", fly there as soon as a fix arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!wantsLocation || !map) return;
    if (origin.coordinate) {
      map.flyTo([origin.coordinate.latitude, origin.coordinate.longitude], 16, { animate: !prefersReducedMotion() });
      setWantsLocation(false);
    } else if (origin.status === 'denied' || origin.status === 'unavailable') {
      map.flyTo([SOLBJERG_PLADS.latitude, SOLBJERG_PLADS.longitude], 16, { animate: !prefersReducedMotion() });
      setWantsLocation(false);
    }
  }, [wantsLocation, origin.coordinate, origin.status]);

  const locate = () => {
    haptic('light');
    setWantsLocation(true);
    requestLocation();
  };

  /** Fly to a place (from the list or "Show on map"), then morph its pin into the card. */
  const focusPlace = useCallback(
    (id: string) => {
      const map = mapRef.current;
      const place = placeById(id);
      if (!map || !place) return;
      setDetent('peek');
      const target = L.latLng(place.coordinate.latitude, place.coordinate.longitude);
      const point = map.latLngToContainerPoint(target);
      const size = map.getSize();
      const comfortablyVisible = point.x > 40 && point.x < size.x - 40 && point.y > 140 && point.y < size.y - 320;
      if (comfortablyVisible) {
        openCard(id);
        return;
      }
      map.once('moveend', () => openCardRef.current(id));
      // Offset so the pin lands above the card rather than behind it.
      const zoom = Math.max(map.getZoom(), 16);
      const projected = map.project(target, zoom).add([0, 120]);
      map.flyTo(map.unproject(projected, zoom), zoom, { animate: !prefersReducedMotion(), duration: 0.6 });
    },
    [openCard],
  );

  useEffect(() => {
    if (!focus || !active) return;
    const frame = requestAnimationFrame(() => focusPlace(focus.id));
    return () => cancelAnimationFrame(frame);
  }, [focus, active, focusPlace]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active && selectionRef.current?.stage === 'card') closeCardRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const selected = selection ? byId.get(selection.id) : undefined;

  return (
    <section className="view map-view" hidden={!active} aria-label={t('tab.map')}>
      <div ref={containerRef} className="map-canvas" />

      {Object.entries(hosts).map(([id, host]) => {
        const snapshot = byId.get(id);
        if (!snapshot) return null;
        return createPortal(
          <MapPin
            snapshot={snapshot}
            filtered={!matchesCategory(snapshot.place, category)}
            selected={selection?.id === id}
          />,
          host,
          id,
        );
      })}

      <div className="map-top">
        <CategoryFilterBar value={category} onChange={setCategory} />
      </div>

      <button
        type="button"
        className={`map-locate icon-button glass glass-press${selection ? ' is-raised' : ''}`}
        onClick={locate}
        aria-label={t('map.locate')}
      >
        <LocateFixed aria-hidden />
      </button>

      <div className="map-overlay">
        {selected && selection && selection.stage !== 'card' && (
          <Ghost
            snapshot={selected}
            selection={selection}
            onExpand={expandGhost}
            onCollapsed={finishCollapse}
          />
        )}
        {selected && selection?.stage === 'card' && <MapPlaceCard snapshot={selected} onClose={closeCard} />}
      </div>

      <BottomSheet
        detent={selection ? 'hidden' : detent}
        onDetentChange={setDetent}
        expandLabel={t('map.sheetExpand')}
        collapseLabel={t('map.sheetCollapse')}
        header={
          <>
            <span className="map-sheet__title">{t('map.inView', { count: inView.length })}</span>
            <span className="map-sheet__open tabular">{t('map.openInView', { count: openInView })}</span>
          </>
        }
      >
        {inView.length === 0 ? (
          <p className="map-sheet__empty">{t('map.emptyView')}</p>
        ) : (
          <ul className="map-sheet__list">
            {inView.map((snapshot) => (
              <li key={snapshot.place.id}>
                <button type="button" className="map-sheet__row" onClick={() => focusPlace(snapshot.place.id)}>
                  <PlaceRow snapshot={snapshot} compact />
                  <ChevronRight className="map-sheet__chevron" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </section>
  );
}

/**
 * A copy of the pin bubble at the pin's screen position. It shares a layoutId
 * with the card, so swapping one for the other morphs between them.
 */
function Ghost({
  snapshot,
  selection,
  onExpand,
  onCollapsed,
}: {
  snapshot: PlaceSnapshot;
  selection: Selection;
  onExpand: () => void;
  onCollapsed: () => void;
}) {
  const { stage } = selection;
  useEffect(() => {
    if (stage === 'ghost') {
      // Let the ghost paint once at the pin, then swap it for the card.
      const frame = requestAnimationFrame(() => requestAnimationFrame(onExpand));
      return () => cancelAnimationFrame(frame);
    }
    // Safety net in case the layout animation callback doesn't fire.
    const timer = window.setTimeout(onCollapsed, 700);
    return () => window.clearTimeout(timer);
  }, [stage, onExpand, onCollapsed]);

  return (
    <motion.div
      layoutId={`pin-${snapshot.place.id}`}
      className="map-ghost"
      style={{ left: selection.x - 19, top: selection.y - 19, borderRadius: 999 }}
      onLayoutAnimationComplete={() => {
        if (stage === 'closing') onCollapsed();
      }}
    >
      <PinBubble snapshot={snapshot} />
    </motion.div>
  );
}

function MapPlaceCard({ snapshot, onClose }: { snapshot: PlaceSnapshot; onClose: () => void }) {
  const { t } = useI18n();
  const { place } = snapshot;
  const layoutKey = `pin-${place.id}`;
  return (
    <motion.div
      layoutId={layoutKey}
      className="map-card glass glass--strong"
      style={{ borderRadius: 28 }}
      role="dialog"
      aria-label={place.name}
    >
      <motion.div
        className="map-card__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
      >
          <div className="map-card__top">
            <PlaceRow snapshot={snapshot} />
            <button type="button" className="icon-button map-card__close" onClick={onClose} aria-label={t('detail.close')}>
              <X aria-hidden />
            </button>
          </div>
          <div className="map-card__actions">
            <a className="button button--primary glass-press" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
              <Navigation aria-hidden /> {t('detail.directions')}
            </a>
            <SaveButton placeId={place.id} name={place.name} className="map-card__save" />
            <button type="button" className="button glass glass-press" onClick={() => openPlace(place.id, layoutKey)}>
              {t('map.details')} <ChevronRight aria-hidden />
            </button>
          </div>
      </motion.div>
    </motion.div>
  );
}
