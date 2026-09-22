import { motion } from 'motion/react';
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { CategoryFilter } from '../models/types';
import { useI18n } from '../viewmodels/i18n';
import { FILTER_META, FILTER_ORDER } from './categoryMeta';
import { spring } from './motion';
import './CategoryFilterBar.css';

interface Props {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
  className?: string;
}

/**
 * Floating glass segmented control: All · Food · Study · Late night.
 * The coloured selection slides between segments. On narrow widths only the
 * active segment keeps its label.
 */
export function CategoryFilterBar({ value, onChange, className = '' }: Props) {
  const { t, lang } = useI18n();
  const pillId = `${useId()}-pill`;
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const compact = useFitsCompact(lang);

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = FILTER_ORDER.indexOf(value);
    const next = FILTER_ORDER[(index + step + FILTER_ORDER.length) % FILTER_ORDER.length] ?? 'all';
    onChange(next);
    buttons.current[next]?.focus();
  };

  return (
    <div ref={compact.wrapRef} className={`filter-bar-wrap ${className}`}>
      <div
        ref={compact.barRef}
        className={`filter-bar glass${compact.isCompact ? ' is-compact' : ''}`}
        role="radiogroup"
        aria-label={t('category.filterLabel')}
        onKeyDown={onKeyDown}
      >
        {FILTER_ORDER.map((option) => {
          const meta = FILTER_META[option];
          const active = option === value;
          const Icon = meta.icon;
          return (
            <button
              key={option}
              ref={(el) => {
                buttons.current[option] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              className={`filter-seg${active ? ' is-active' : ''}`}
              style={{ '--seg': meta.color, '--seg-ink': meta.ink } as CSSProperties}
              onClick={() => onChange(option)}
            >
              {active && (
                <motion.span
                  layoutId={pillId}
                  className="filter-seg__pill"
                  style={{ borderRadius: 999 }}
                  transition={spring}
                  aria-hidden
                />
              )}
              <Icon className="filter-seg__icon" strokeWidth={2.3} aria-hidden />
              <span className="filter-seg__label">{t(meta.label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Like SwiftUI's ViewThatFits: measure the bar with every label shown and
 * switch to the compact layout only when that doesn't fit the available width.
 */
function useFitsCompact(lang: string) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fullWidth = useRef(0);
  const [isCompact, setCompact] = useState(false);

  // Re-measure the full layout whenever the labels change.
  useLayoutEffect(() => {
    setCompact(false);
    fullWidth.current = 0;
  }, [lang]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const bar = barRef.current;
    if (!wrap || !bar) return;
    const measure = () => {
      if (!bar.classList.contains('is-compact')) fullWidth.current = bar.scrollWidth;
      if (wrap.clientWidth > 0 && fullWidth.current > 0) setCompact(fullWidth.current > wrap.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [isCompact, lang]);

  return { wrapRef, barRef, isCompact };
}
