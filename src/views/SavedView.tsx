import { Heart, Info, Languages } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { CategoryIcon } from '../components/CategoryIcon';
import { useScrollToTop } from '../components/hooks';
import { spring } from '../components/motion';
import { PlaceCard } from '../components/PlaceCard';
import { StatusPill } from '../components/StatusPill';
import { LANG_NAMES, LANGS } from '../i18n/translate';
import { sortForFeed } from '../models/ranking';
import { primaryCategory } from '../models/types';
import { setLang, useI18n } from '../viewmodels/i18n';
import { openPlace } from '../viewmodels/navigation';
import { clearRecents, useFavorites, useRecents } from '../viewmodels/saved';
import { useSnapshots } from '../viewmodels/snapshots';
import './SavedView.css';

/** Favorites with live status, recently viewed places, and app settings. */
export function SavedView({ active }: { active: boolean }) {
  const { t, lang } = useI18n();
  const snapshots = useSnapshots();
  const favorites = useFavorites();
  const recents = useRecents();
  const scrollRef = useRef<HTMLElement>(null);
  useScrollToTop(scrollRef, 'saved');

  const byId = useMemo(() => new Map(snapshots.map((s) => [s.place.id, s])), [snapshots]);
  const saved = useMemo(
    () => sortForFeed(favorites.flatMap((f) => byId.get(f.id) ?? [])),
    [favorites, byId],
  );
  const recent = useMemo(() => recents.flatMap((r) => byId.get(r.id) ?? []), [recents, byId]);
  const openCount = saved.filter((s) => s.status.isOpen).length;

  return (
    <section ref={scrollRef} className="view saved" hidden={!active} aria-label={t('saved.title')}>
      <div className="view__content">
        <header className="page-header">
          <h1 className="page-title">{t('saved.title')}</h1>
          <p className="page-subtitle">
            {saved.length > 0 ? t('saved.subtitle', { count: openCount }) : t('saved.subtitleEmpty')}
          </p>
        </header>

        {saved.length === 0 ? (
          <div className="empty-state saved-empty">
            <span className="empty-state__icon glass" aria-hidden>
              <Heart />
            </span>
            <h2>{t('saved.emptyTitle')}</h2>
            <p>{t('saved.emptyBody')}</p>
          </div>
        ) : (
          <>
            <h2 className="visually-hidden">{t('saved.favorites')}</h2>
            <ul className="feed">
            <AnimatePresence mode="popLayout" initial={false}>
              {saved.map((snapshot) => (
                <PlaceCard key={snapshot.place.id} snapshot={snapshot} layoutKey={`saved-${snapshot.place.id}`} />
              ))}
            </AnimatePresence>
            </ul>
          </>
        )}

        {recent.length > 0 && (
          <section className="recents" aria-labelledby="recents-title">
            <div className="section-head">
              <h2 id="recents-title" className="section-title">
                {t('saved.recent')}
              </h2>
              <button type="button" className="section-head__action" onClick={clearRecents}>
                {t('saved.clear')}
              </button>
            </div>
            <ul className="recents__list">
              <AnimatePresence initial={false}>
                {recent.map((snapshot) => {
                  const key = `recent-${snapshot.place.id}`;
                  return (
                    <motion.li
                      key={snapshot.place.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={spring}
                    >
                      <motion.button
                        type="button"
                        layoutId={key}
                        className="recent-tile"
                        style={{ borderRadius: 22 }}
                        onClick={() => openPlace(snapshot.place.id, key)}
                        aria-label={t('a11y.openDetails', { name: snapshot.place.name })}
                      >
                        <CategoryIcon category={primaryCategory(snapshot.place)} size="sm" dimmed={!snapshot.status.isOpen} />
                        <span className="recent-tile__name">{snapshot.place.name}</span>
                        <StatusPill display={snapshot.display} size="sm" />
                      </motion.button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        )}

        <section className="settings" aria-label={t('saved.language')}>
          <div className="settings__row">
            <span className="settings__label">
              <Languages aria-hidden /> {t('saved.language')}
            </span>
            <div className="lang-switch glass" role="radiogroup" aria-label={t('saved.language')}>
              {LANGS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={lang === option}
                  className={`lang-switch__option${lang === option ? ' is-active' : ''}`}
                  onClick={() => setLang(option)}
                  lang={option}
                >
                  {lang === option && (
                    <motion.span layoutId="lang-pill" className="lang-switch__pill" style={{ borderRadius: 999 }} transition={spring} />
                  )}
                  {LANG_NAMES[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="settings__about">
            <h2>
              <Info aria-hidden /> {t('saved.aboutTitle')}
            </h2>
            <p>{t('saved.aboutBody')}</p>
          </div>
        </section>
      </div>
    </section>
  );
}
