import { BookOpen, ChevronRight, MoonStar, Sparkles, Sunrise, Sunset, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GlassCard } from '../components/GlassCard';
import { spring } from '../components/motion';
import { PlaceRow } from '../components/PlaceRow';
import { openingTimeLabel } from '../models/status';
import type { Suggestion, SuggestionKind } from '../models/suggestions';
import { useI18n } from '../viewmodels/i18n';
import { openPlace } from '../viewmodels/navigation';
import './SuggestionCard.css';

const KIND_META: Record<SuggestionKind, { icon: LucideIcon; tint: string }> = {
  morning: { icon: Sunrise, tint: 'var(--food)' },
  lunch: { icon: UtensilsCrossed, tint: 'var(--food)' },
  afternoon: { icon: BookOpen, tint: 'var(--study)' },
  evening: { icon: Sunset, tint: 'var(--accent)' },
  lateNight: { icon: MoonStar, tint: 'var(--lateNight)' },
};

/** The "Right now" card: a different answer for morning, lunch, afternoon, evening and late night. */
export function SuggestionCard({ suggestion, now }: { suggestion: Suggestion; now: number }) {
  const { t, lang } = useI18n();
  const { kind, picks, nextOpening } = suggestion;
  const { icon: Icon, tint } = KIND_META[kind];
  const titleKey = `suggest.${kind}.title` as const;
  const subtitleKey = `suggest.${kind}.subtitle` as const;

  return (
    <GlassCard as="section" variant="glass" tint={tint} className="suggestion" aria-labelledby="suggestion-title">
      <AnimatePresence mode="wait" initial={false}>
        <motion.header
          key={kind}
          className="suggestion__header"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={spring}
        >
          <span className="suggestion__icon" style={{ background: tint }} aria-hidden>
            <Icon strokeWidth={2.2} />
          </span>
          <div className="suggestion__heading">
            <p className="suggestion__label">
              <Sparkles aria-hidden /> {t('suggest.label')}
            </p>
            <h2 id="suggestion-title" className="suggestion__title">
              {t(titleKey)}
            </h2>
            <p className="suggestion__subtitle">{t(subtitleKey)}</p>
          </div>
        </motion.header>
      </AnimatePresence>

      {picks.length > 0 ? (
        <ul className="suggestion__picks">
          {picks.map((snapshot) => {
            const key = `suggest-${snapshot.place.id}`;
            return (
              <li key={snapshot.place.id}>
                <motion.button
                  type="button"
                  layoutId={key}
                  className="suggestion__pick"
                  style={{ borderRadius: 18 }}
                  onClick={() => openPlace(snapshot.place.id, key)}
                  aria-label={t('a11y.openDetails', { name: snapshot.place.name })}
                >
                  <PlaceRow snapshot={snapshot} compact />
                  <ChevronRight className="suggestion__chevron" aria-hidden />
                </motion.button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="suggestion__empty">
          {nextOpening && !nextOpening.status.isOpen && nextOpening.status.opensAt !== null
            ? t('suggest.nextOpening', {
                name: nextOpening.place.name,
                when: openingTimeLabel(nextOpening.status.opensAt, now, lang),
              })
            : t('suggest.allClosed')}
        </p>
      )}
    </GlassCard>
  );
}
