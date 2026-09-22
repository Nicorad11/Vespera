import type { CategoryFilter } from '../models/types';
import './AmbientBackground.css';

/** Soft drifting colour behind everything; it takes on the selected category's hue. */
export function AmbientBackground({ category }: { category: CategoryFilter }) {
  return (
    <div className="ambient" data-category={category} aria-hidden>
      <div className="ambient__blob ambient__blob--1" />
      <div className="ambient__blob ambient__blob--2" />
      <div className="ambient__blob ambient__blob--3" />
    </div>
  );
}
