import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { spring } from './motion';

/** A number that rolls up or down when it changes (the live open count). */
export function AnimatedNumber({ value }: { value: number }) {
  const [last, setLast] = useState({ value, direction: 1 });
  if (last.value !== value) setLast({ value, direction: value > last.value ? 1 : -1 });
  const { direction } = last;

  return (
    <span style={{ display: 'inline-grid', overflow: 'hidden', verticalAlign: 'bottom' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="tabular"
          style={{ gridArea: '1 / 1', display: 'inline-block' }}
          initial={{ y: `${direction * 0.9}em`, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: `${-direction * 0.9}em`, opacity: 0 }}
          transition={spring}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
