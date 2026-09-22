import { describe, expect, it } from 'vitest';
import { describeStatus, minutesUntil, statusAt } from './status';
import { cph, hours } from './testUtils';

const MINUTE = 60_000;
// Monday 21 September 2026.
const mon = (hour: number, minute = 0, second = 0) => cph(2026, 9, 21, hour, minute, second);

describe('status labels', () => {
  const now = mon(12);

  it('says "Open" when closing is far away', () => {
    const d = describeStatus({ isOpen: true, until: now + 50 * MINUTE }, now, 'en');
    expect(d).toEqual({ tone: 'open', label: 'Open', detail: 'Open until 12:50', pulse: false });
  });

  it('counts down when closing within 45 minutes', () => {
    const d = describeStatus({ isOpen: true, until: now + 25 * MINUTE }, now, 'en');
    expect(d.tone).toBe('closingSoon');
    expect(d.label).toBe('Closes in 25 min');
    expect(d.pulse).toBe(false);
  });

  it('treats exactly 45 minutes as still comfortably open', () => {
    expect(describeStatus({ isOpen: true, until: now + 45 * MINUTE }, now, 'en').tone).toBe('open');
    expect(describeStatus({ isOpen: true, until: now + 44 * MINUTE }, now, 'en').tone).toBe('closingSoon');
  });

  it('pulses within 15 minutes of closing', () => {
    expect(describeStatus({ isOpen: true, until: now + 15 * MINUTE }, now, 'en').pulse).toBe(true);
    expect(describeStatus({ isOpen: true, until: now + 16 * MINUTE }, now, 'en').pulse).toBe(false);
  });

  it('rounds partial minutes up', () => {
    const at = mon(14, 35, 10);
    expect(minutesUntil(mon(15), at)).toBe(25);
    expect(describeStatus({ isOpen: true, until: mon(15) }, at, 'en').label).toBe('Closes in 25 min');
  });

  it('describes places open around the clock', () => {
    expect(describeStatus({ isOpen: true, until: null }, now, 'en')).toMatchObject({
      label: 'Open',
      detail: 'Open 24 hours',
    });
  });

  it('shows the opening time alone when it is less than a day away', () => {
    expect(describeStatus({ isOpen: false, opensAt: cph(2026, 9, 22, 8) }, mon(23), 'en').label).toBe(
      'Closed · opens 08:00',
    );
  });

  it('adds the weekday when the opening is a day or more away', () => {
    const saturdayNoon = cph(2026, 9, 26, 12);
    expect(describeStatus({ isOpen: false, opensAt: cph(2026, 9, 28, 8) }, saturdayNoon, 'en').label).toBe(
      'Closed · opens Mon 08:00',
    );
  });

  it('says just "Closed" when nothing opens soon', () => {
    expect(describeStatus({ isOpen: false, opensAt: null }, now, 'en').label).toBe('Closed');
  });

  it('speaks Danish', () => {
    expect(describeStatus({ isOpen: true, until: now + 20 * MINUTE }, now, 'da').label).toBe('Lukker om 20 min');
    expect(describeStatus({ isOpen: true, until: now + 3 * 60 * MINUTE }, now, 'da').label).toBe('Åben');
    const saturdayNoon = cph(2026, 9, 26, 12);
    expect(describeStatus({ isOpen: false, opensAt: cph(2026, 9, 28, 8) }, saturdayNoon, 'da').label).toBe(
      'Lukket · åbner man 08:00',
    );
  });

  it('works end to end from opening hours', () => {
    const cafe = hours({ mon: ['07:30-12:40'] });
    const at = mon(12, 30);
    expect(describeStatus(statusAt(cafe, at), at, 'en')).toMatchObject({
      tone: 'closingSoon',
      label: 'Closes in 10 min',
      pulse: true,
    });
  });
});
