import { Clock, Heart, Map as MapIcon, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { MessageKey } from '../i18n/strings';
import { useI18n } from '../viewmodels/i18n';
import { selectTab, useNavigation, type Tab } from '../viewmodels/navigation';
import { spring } from './motion';
import './TabBar.css';

const TAB_ITEMS: { id: Tab; icon: LucideIcon; label: MessageKey }[] = [
  { id: 'now', icon: Clock, label: 'tab.now' },
  { id: 'map', icon: MapIcon, label: 'tab.map' },
  { id: 'saved', icon: Heart, label: 'tab.saved' },
];

/** Floating glass tab bar. Tapping the active tab scrolls it back to the top. */
export function TabBar({ savedOpenCount }: { savedOpenCount: number }) {
  const { t } = useI18n();
  const { tab: active } = useNavigation();
  return (
    <nav className="tab-bar glass" aria-label="Vespera">
      {TAB_ITEMS.map(({ id, icon: Icon, label }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            className={`tab-bar__item${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => selectTab(id)}
          >
            {isActive && (
              <motion.span layoutId="tab-indicator" className="tab-bar__indicator" style={{ borderRadius: 999 }} transition={spring} />
            )}
            <span className="tab-bar__icon">
              <Icon strokeWidth={isActive ? 2.4 : 2} aria-hidden />
              {id === 'saved' && savedOpenCount > 0 && (
                <span className="tab-bar__badge tabular" aria-hidden>
                  {savedOpenCount}
                </span>
              )}
            </span>
            <span className="tab-bar__label">{t(label)}</span>
          </button>
        );
      })}
    </nav>
  );
}
