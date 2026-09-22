import type { StatusDisplay } from '../models/status';
import './StatusPill.css';

interface Props {
  display: StatusDisplay;
  size?: 'sm' | 'md';
}

/** "Open" (green), "Closes in 25 min" (orange, pulses under 15 min), "Closed · opens 08:00" (grey). */
export function StatusPill({ display, size = 'md' }: Props) {
  return (
    <span
      className={`status-pill status-pill--${display.tone} status-pill--${size}${display.pulse ? ' is-pulsing' : ''}`}
    >
      <span className="status-pill__dot" aria-hidden />
      <span className="status-pill__label">{display.label}</span>
    </span>
  );
}
