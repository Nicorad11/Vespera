import { animate, motion, useDragControls, useMotionValue, type MotionStyle, type PanInfo } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { spring } from './motion';
import './BottomSheet.css';

export type Detent = 'hidden' | 'peek' | 'half' | 'full';

/** How much of the sheet shows above the tab bar when peeking. */
const PEEK_VISIBLE = 92;
const HEADER_HEIGHT = 76;

interface Props {
  detent: Detent;
  onDetentChange: (detent: Detent) => void;
  header: ReactNode;
  expandLabel: string;
  collapseLabel: string;
  children: ReactNode;
}

/**
 * A glass bottom sheet with peek / half / full detents. Drag the header to
 * move it; it snaps to the nearest detent, taking flick velocity into account.
 * Tapping the header toggles between peek and half.
 */
export function BottomSheet({ detent, onDetentChange, header, expandLabel, collapseLabel, children }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const chromeProbe = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ height: 0, chrome: 0 });
  const dragControls = useDragControls();
  const y = useMotionValue(10_000);
  const lastDrag = useRef(0);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setArea({ height: el.clientHeight, chrome: chromeProbe.current?.offsetHeight ?? 0 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const offsetFor = useCallback(
    (d: Detent) => {
      const { height, chrome } = area;
      switch (d) {
        case 'full':
          return 0;
        case 'half':
          return Math.round(height * 0.46);
        case 'peek':
          return Math.max(0, height - chrome - PEEK_VISIBLE);
        case 'hidden':
          return height + 24;
      }
    },
    [area],
  );

  useEffect(() => {
    if (area.height === 0) return;
    const controls = animate(y, offsetFor(detent), spring);
    return () => controls.stop();
  }, [detent, area, offsetFor, y]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    lastDrag.current = Date.now();
    const projected = y.get() + info.velocity.y * 0.18;
    const candidates: Detent[] = ['full', 'half', 'peek'];
    const nearest = candidates.reduce((best, d) =>
      Math.abs(offsetFor(d) - projected) < Math.abs(offsetFor(best) - projected) ? d : best,
    );
    if (nearest === detent) animate(y, offsetFor(detent), spring);
    else onDetentChange(nearest);
  };

  const onHeaderClick = () => {
    if (Date.now() - lastDrag.current < 250) return;
    onDetentChange(detent === 'peek' ? 'half' : 'peek');
  };

  const visible = area.height - offsetFor(detent === 'hidden' ? 'peek' : detent);

  return (
    <div ref={areaRef} className="sheet-area">
      <div ref={chromeProbe} className="sheet-area__chrome-probe" aria-hidden />
      <motion.div
        className="sheet glass"
        style={
          {
            y,
            borderRadius: 28,
            '--sheet-visible': `${visible}px`,
            '--sheet-header': `${HEADER_HEIGHT}px`,
          } as unknown as MotionStyle
        }
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: offsetFor('peek') }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        aria-hidden={detent === 'hidden'}
        inert={detent === 'hidden'}
      >
        <div className="sheet__header" onPointerDown={(event) => dragControls.start(event)}>
          <span className="sheet__grabber" aria-hidden />
          <button
            type="button"
            className="sheet__summary"
            aria-expanded={detent === 'half' || detent === 'full'}
            aria-label={detent === 'peek' ? expandLabel : collapseLabel}
            onClick={onHeaderClick}
          >
            {header}
          </button>
        </div>
        <div className={`sheet__body${detent === 'peek' ? ' is-peeking' : ''}`}>{children}</div>
      </motion.div>
    </div>
  );
}
