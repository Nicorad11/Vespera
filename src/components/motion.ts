import type { Transition } from 'motion/react';

/** The app-wide spring: roughly SwiftUI's spring(response: 0.35, dampingFraction: 0.8). */
export const spring: Transition = { type: 'spring', visualDuration: 0.35, bounce: 0.2 };

/** A bouncier spring for small delights (save heart, pins). */
export const bouncy: Transition = { type: 'spring', visualDuration: 0.4, bounce: 0.45 };
