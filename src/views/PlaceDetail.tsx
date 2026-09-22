import {
  BadgePercent,
  ChevronDown,
  Info,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plug,
  Share,
  Tag,
  Volume1,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion, useDragControls, useIsPresent, type PanInfo } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { categoryMeta } from '../components/categoryMeta';
import { CategoryIcon } from '../components/CategoryIcon';
import { spring } from '../components/motion';
import { SaveButton } from '../components/SaveButton';
import { StatusPill } from '../components/StatusPill';
import type { MessageKey } from '../i18n/strings';
import { weekdayLong } from '../i18n/translate';
import { danishHoliday } from '../models/holidays';
import { formatTimeRange, isAllDay, rangesOn, WEEK_ORDER, DAY_KEYS, type TimeRange } from '../models/openingHours';
import type { PlaceSnapshot } from '../models/ranking';
import { civilDateOf, weekdayOf } from '../models/time';
import { CAMPUS_NAMES, primaryCategory, type NoiseLevel } from '../models/types';
import { directionsUrl, placeUrl } from '../services/directions';
import { haptic } from '../services/haptics';
import { useNow } from '../viewmodels/clock';
import { useI18n } from '../viewmodels/i18n';
import { closePlace, showOnMap, useNavigation, type DetailRoute } from '../viewmodels/navigation';
import { useSnapshots } from '../viewmodels/snapshots';
import { showToast } from '../viewmodels/toast';
import './PlaceDetail.css';

/** The detail overlay. It grows out of whichever card or pin was tapped. */
export function PlaceDetail() {
  const { detail } = useNavigation();
  const snapshots = useSnapshots();
  const snapshot = detail ? snapshots.find((s) => s.place.id === detail.id) : undefined;
  return (
    <AnimatePresence>
      {detail && snapshot && <DetailSheet key={detail.id} route={detail} snapshot={snapshot} />}
    </AnimatePresence>
  );
}

const NOISE_ICON: Record<NoiseLevel, LucideIcon> = { quiet: VolumeX, medium: Volume1, lively: Volume2 };

function DetailSheet({ route, snapshot }: { route: DetailRoute; snapshot: PlaceSnapshot }) {
  const { t } = useI18n();
  const { place, display, walkingMinutes } = snapshot;
  const meta = categoryMeta(primaryCategory(place));
  const dragControls = useDragControls();
  const closeButton = useRef<HTMLButtonElement>(null);
  const morph = route.layoutKey !== null;
  // While animating out, let taps and screen readers go straight to the app underneath.
  const isPresent = useIsPresent();

  // Focus the close button on open, return focus on close, and close on Escape.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePlace();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 700) closePlace();
  };

  const share = async () => {
    const url = placeUrl(place);
    const text = t('detail.shareText', { name: place.name, status: display.label });
    try {
      if (navigator.share) {
        await navigator.share({ title: place.name, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      haptic('light');
      showToast(t('detail.copied'));
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  };

  return (
    <div className={`detail-layer${isPresent ? '' : ' is-leaving'}`} inert={!isPresent}>
      <motion.div
        className="detail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closePlace}
      />
      <motion.div
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        layoutId={route.layoutKey ?? undefined}
        style={{ borderRadius: 30, '--tint': meta.color, '--tint-ink': meta.ink } as CSSProperties}
        initial={morph ? undefined : { y: '100%' }}
        animate={morph ? undefined : { y: 0 }}
        exit={morph ? undefined : { y: '100%' }}
        transition={spring}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={onDragEnd}
      >
        <motion.div
          className="detail__scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25, delay: morph ? 0.1 : 0 } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <header className="detail-hero" onPointerDown={(event) => dragControls.start(event)}>
            <span className="detail-hero__grabber" aria-hidden />
            <CategoryIcon category={primaryCategory(place)} size="lg" dimmed={!snapshot.status.isOpen} />
            <h1 id="detail-title" className="detail-hero__name">
              {place.name}
            </h1>
            <p className="detail-hero__sub">
              {t('detail.campus', { campus: CAMPUS_NAMES[place.campus] })} · {t('place.walk', { minutes: walkingMinutes })}
            </p>
            <div className="detail-hero__status">
              <StatusPill display={display} />
              {display.detail !== display.label && <span className="detail-hero__until">{display.detail}</span>}
            </div>
          </header>

          <div className="detail-actions">
            <a className="button button--primary glass-press" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
              <Navigation aria-hidden /> {t('detail.directions')}
            </a>
            <SaveButton placeId={place.id} name={place.name} withLabel />
            <button type="button" className="button glass glass-press" onClick={share}>
              <Share aria-hidden /> {t('detail.share')}
            </button>
          </div>

          <section className="detail-section" aria-label={t('detail.facts')}>
            <ul className="facts">
              <Fact icon={Plug} on={place.hasOutlets} label={place.hasOutlets ? t('place.outlets') : t('place.noOutlets')} />
              <Fact icon={place.wifi ? Wifi : WifiOff} on={place.wifi} label={place.wifi ? t('place.wifi') : t('place.noWifi')} />
              <Fact icon={NOISE_ICON[place.noiseLevel]} on label={t(`noise.${place.noiseLevel}`)} caption={t('noise.label')} />
              <li className="fact is-on">
                <span className="fact__price" aria-hidden>
                  {[1, 2, 3].map((level) => (
                    <span key={level} className={level <= place.priceLevel ? 'is-on' : ''}>
                      kr
                    </span>
                  ))}
                </span>
                <span className="fact__label">{t(`price.${place.priceLevel}` as MessageKey)}</span>
                <span className="fact__caption">{t('price.label')}</span>
              </li>
            </ul>
          </section>

          {(place.cheapestItem || place.studentDiscount) && (
            <section className="detail-section detail-deals">
              {place.cheapestItem && (
                <p className="deal">
                  <Tag aria-hidden />
                  <span>
                    <strong>{t('place.cheapest')}</strong> {place.cheapestItem.name} ·{' '}
                    <span className="tabular">{place.cheapestItem.price} kr</span>
                  </span>
                </p>
              )}
              {place.studentDiscount && (
                <p className="deal deal--student">
                  <BadgePercent aria-hidden />
                  <span>
                    <strong>{t('place.studentDiscount')}</strong> {place.studentDiscount}
                  </span>
                </p>
              )}
            </section>
          )}

          <OpeningHoursSection snapshot={snapshot} />

          {place.tags.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section__title">{t('detail.goodToKnow')}</h2>
              <ul className="tags">
                {place.tags.map((tag) => (
                  <li key={tag} className="tag">
                    {tag}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="detail-section">
            <h2 className="detail-section__title">{t('detail.address')}</h2>
            <p className="detail-address">
              <MapPin aria-hidden /> {place.address}
            </p>
            <button type="button" className="detail-link" onClick={() => showOnMap(place.id)}>
              <MapIcon aria-hidden /> {t('tab.map')}
            </button>
          </section>

          {!place.verified && (
            <p className="detail-unverified">
              <Info aria-hidden /> {t('detail.unverified')}
            </p>
          )}
        </motion.div>

        <button ref={closeButton} type="button" className="detail__close icon-button glass glass-press" onClick={closePlace} aria-label={t('detail.close')}>
          <X aria-hidden />
        </button>
      </motion.div>
    </div>
  );
}

function Fact({ icon: Icon, on, label, caption }: { icon: LucideIcon; on: boolean; label: string; caption?: string }) {
  return (
    <li className={`fact${on ? ' is-on' : ''}`}>
      <Icon className="fact__icon" aria-hidden />
      <span className="fact__label">{label}</span>
      {caption && <span className="fact__caption">{caption}</span>}
    </li>
  );
}

function describeRanges(ranges: TimeRange[], t: (key: MessageKey) => string): string {
  if (ranges.length === 0) return t('detail.closedAllDay');
  if (ranges.some(isAllDay)) return t('status.open24h');
  return ranges.map(formatTimeRange).join(', ');
}

function OpeningHoursSection({ snapshot }: { snapshot: PlaceSnapshot }) {
  const { t, lang } = useI18n();
  const now = useNow();
  const [expanded, setExpanded] = useState(false);
  const { openingHours } = snapshot.place;
  const today = civilDateOf(now);
  const todayKey = DAY_KEYS[weekdayOf(today)];
  const holiday = danishHoliday(today);
  const holidayRulesApply = holiday !== null && openingHours.holidays !== null;

  return (
    <section className="detail-section">
      <h2 className="detail-section__title">{t('detail.hours')}</h2>
      {holidayRulesApply && (
        <p className="detail-note">{t('detail.holidayToday', { holiday: t(`holiday.${holiday}`) })}</p>
      )}
      <div className="hours-today">
        <span className="hours-today__label">{t('detail.today')}</span>
        <span className="hours-today__value tabular">{describeRanges(rangesOn(openingHours, today), t)}</span>
      </div>
      <button
        type="button"
        className="hours-toggle"
        aria-expanded={expanded}
        aria-controls="hours-week"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? t('detail.hideWeek') : t('detail.showWeek')}
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={spring} style={{ display: 'inline-grid' }}>
          <ChevronDown aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            id="hours-week"
            className="hours-week"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
          >
            {WEEK_ORDER.map((day) => (
              <li key={day} className={day === todayKey ? 'is-today' : ''}>
                <span>{capitalize(weekdayLong(lang, DAY_KEYS.indexOf(day)))}</span>
                <span className="tabular">{describeRanges(openingHours.weekly[day], t)}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      {openingHours.holidays === null && <p className="detail-fine">{t('detail.holidayMayDiffer')}</p>}
    </section>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
