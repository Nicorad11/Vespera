import { motion, type HTMLMotionProps } from 'motion/react';
import type { CSSProperties } from 'react';
import './GlassCard.css';

type Props = HTMLMotionProps<'div'> & {
  as?: 'div' | 'li' | 'article' | 'section';
  /**
   * `surface` (default) is a mostly opaque reading surface; `glass` is real
   * translucent glass, reserved for featured cards like the suggestion.
   */
  variant?: 'surface' | 'glass';
  /** Optional accent colour that tints the card edge and glow. */
  tint?: string;
};

const components = {
  div: motion.div,
  li: motion.li,
  article: motion.article,
  section: motion.section,
} as const;

export function GlassCard({ as = 'div', variant = 'surface', tint, className = '', style, ...rest }: Props) {
  const Component = components[as] as typeof motion.div;
  const cardStyle = {
    // Set inline so shared-layout animations can correct the radius while scaling.
    borderRadius: 24,
    ...(tint ? { '--card-tint': tint } : {}),
    ...style,
  } as CSSProperties;
  return (
    <Component
      className={`glass-card glass-card--${variant}${variant === 'glass' ? ' glass' : ''} ${className}`}
      style={cardStyle}
      {...rest}
    />
  );
}
