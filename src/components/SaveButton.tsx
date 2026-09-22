import { Heart } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { haptic } from '../services/haptics';
import { useI18n } from '../viewmodels/i18n';
import { toggleFavorite, useIsFavorite } from '../viewmodels/saved';
import { showToast } from '../viewmodels/toast';
import { bouncy } from './motion';
import './SaveButton.css';

interface Props {
  placeId: string;
  name: string;
  className?: string;
  /** Show "Save"/"Saved" next to the heart (detail screen). */
  withLabel?: boolean;
}

const PARTICLES = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

/** Heart toggle with a small burst and a success haptic when saving. */
export function SaveButton({ placeId, name, className = '', withLabel = false }: Props) {
  const { t } = useI18n();
  const saved = useIsFavorite(placeId);
  const [burst, setBurst] = useState(0);

  const onClick = () => {
    const nowSaved = toggleFavorite(placeId);
    if (nowSaved) {
      setBurst((n) => n + 1);
      haptic('success');
      showToast(t('toast.saved'));
    } else {
      haptic('light');
      showToast(t('toast.removed'));
    }
  };

  return (
    <button
      type="button"
      className={`save-button${saved ? ' is-saved' : ''}${withLabel ? ' save-button--labelled glass glass-press' : ''} ${className}`}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : saved ? t('a11y.unsave', { name }) : t('a11y.save', { name })}
      onClick={onClick}
    >
      <span className="save-button__icon">
        <motion.span
          key={saved ? 'saved' : 'unsaved'}
          className="save-button__heart"
          initial={{ scale: saved ? 0.4 : 0.8 }}
          animate={{ scale: 1 }}
          transition={bouncy}
        >
          <Heart fill={saved ? 'currentColor' : 'none'} strokeWidth={2.2} aria-hidden />
        </motion.span>
        <AnimatePresence>
          {saved && burst > 0 && (
            <motion.span key={burst} className="save-button__burst" aria-hidden exit={{ opacity: 0 }}>
              <motion.span
                className="save-button__ring"
                initial={{ scale: 0.3, opacity: 0.8 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
              {PARTICLES.map((angle) => (
                <motion.span
                  key={angle}
                  className="save-button__particle"
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{ x: Math.cos(angle) * 22, y: Math.sin(angle) * 22, scale: 0.2, opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.3, 1] }}
                />
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {withLabel && <span>{saved ? t('detail.saved') : t('detail.save')}</span>}
    </button>
  );
}
