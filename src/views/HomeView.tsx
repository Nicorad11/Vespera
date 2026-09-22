import { LocateFixed, MapPin, MoonStar, RefreshCw } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CategoryFilterBar } from '../components/CategoryFilterBar';
import { useCollapsingHeader, usePullToRefresh, useScrollToTop, type PullState } from '../components/hooks';
import { PlaceCard } from '../components/PlaceCard';
import { Toggle } from '../components/Toggle';
import { CPH_TIME_ZONE } from '../models/time';
import { useHomeViewModel, type HomeViewModel } from '../viewmodels/home';
import { useI18n } from '../viewmodels/i18n';
import { SuggestionCard } from './SuggestionCard';
import './HomeView.css';

/** The main screen. It answers "where can I go right now?" with zero taps. */
export function HomeView({ active }: { active: boolean }) {
  const vm = useHomeViewModel();
  const { t, locale } = useI18n();
  const scrollRef = useRef<HTMLElement>(null);
  const collapsed = useCollapsingHeader(scrollRef, 110);
  const pull = usePullToRefresh(scrollRef, vm.refresh);
  useScrollToTop(scrollRef, 'now');

  const date = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: CPH_TIME_ZONE,
  }).format(vm.now);

  return (
    <section ref={scrollRef} className="view home" hidden={!active} aria-label={t('tab.now')}>
      <PullIndicator state={pull} />
      <div className="view__content">
        <header className="home-hero">
          <div className="home-hero__top">
            <p className="eyebrow">{date.charAt(0).toUpperCase() + date.slice(1)}</p>
            <button type="button" className="icon-button glass glass-press" onClick={vm.refresh} aria-label={t('home.refresh')}>
              <RefreshCw aria-hidden />
            </button>
          </div>
          <h1 className="home-clock tabular">
            <time dateTime={new Date(vm.now).toISOString()} aria-label={`${vm.clock}, ${t('home.copenhagenTime')}`}>
              {vm.clock}
            </time>
          </h1>
          <Summary count={vm.openCount} />
        </header>

        <div className={`home-sticky${collapsed ? ' is-collapsed' : ''}`}>
          <div className="home-sticky__glass glass" aria-hidden />
          <p className="home-sticky__compact" aria-hidden>
            <span className="tabular">{vm.clock}</span>
            <span className="home-sticky__dot">·</span>
            <span>{t('home.compactOpen', { count: vm.openCount })}</span>
          </p>
          <CategoryFilterBar value={vm.category} onChange={vm.setCategory} />
        </div>

        <SuggestionCard suggestion={vm.suggestion} now={vm.now} />

        <div className="home-controls">
          <Toggle checked={vm.openOnly} onChange={vm.setOpenOnly} label={t('home.openNowOnly')} />
          <span className="home-controls__sort">{t('home.nearestFirst')}</span>
        </div>
        <LocationNotice origin={vm.origin} onRequest={vm.requestLocation} />

        <ul className="feed">
          <AnimatePresence mode="popLayout" initial={false}>
            {vm.visible.map((snapshot) => (
              <PlaceCard key={snapshot.place.id} snapshot={snapshot} layoutKey={`feed-${snapshot.place.id}`} />
            ))}
          </AnimatePresence>
        </ul>

        {vm.visible.length === 0 && (
          <div className="empty-state">
            <span className="empty-state__icon glass" aria-hidden>
              <MoonStar />
            </span>
            <h2>{t('home.emptyTitle')}</h2>
            <p>{t('home.emptyBody')}</p>
            <button type="button" className="button button--primary glass-press" onClick={() => vm.setOpenOnly(false)}>
              {t('home.showClosed')}
            </button>
          </div>
        )}

        {vm.openOnly && vm.visible.length > 0 && vm.hiddenClosedCount > 0 && (
          <button type="button" className="show-closed" onClick={() => vm.setOpenOnly(false)}>
            {t('home.showClosed')} <span className="tabular">({vm.hiddenClosedCount})</span>
          </button>
        )}
      </div>
    </section>
  );
}

function Summary({ count }: { count: number }) {
  const { t } = useI18n();
  if (count === 0) return <p className="home-summary">{t('home.summaryNone')}</p>;
  // Split the translated sentence around the number so only the digits roll.
  const text = t('home.summary', { count });
  const index = text.indexOf(String(count));
  return (
    <p className="home-summary" aria-live="polite">
      {text.slice(0, index)}
      <AnimatedNumber value={count} />
      {text.slice(index + String(count).length)}
    </p>
  );
}

function PullIndicator({ state }: { state: PullState }) {
  return (
    <div className={`pull-indicator glass is-${state}`} aria-hidden>
      <RefreshCw />
    </div>
  );
}

function LocationNotice({ origin, onRequest }: Pick<HomeViewModel, 'origin'> & { onRequest: () => void }) {
  const { t } = useI18n();
  const message = origin.fromUser
    ? t('location.fromYou')
    : origin.status === 'denied'
      ? t('location.denied')
      : origin.status === 'far'
        ? t('location.far')
        : origin.status === 'locating'
          ? t('location.locating')
          : t('location.fromCampus');
  const canRequest = origin.status === 'idle' || origin.status === 'unavailable';
  return (
    <div className="location-notice">
      <MapPin aria-hidden />
      <span>{message}</span>
      {canRequest && (
        <button type="button" className="location-notice__action" onClick={onRequest}>
          <LocateFixed aria-hidden />
          {t('location.useMine')}
        </button>
      )}
    </div>
  );
}
