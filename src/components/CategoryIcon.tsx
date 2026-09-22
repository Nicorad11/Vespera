import type { Category } from '../models/types';
import { categoryMeta } from './categoryMeta';
import './CategoryIcon.css';

interface Props {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
  dimmed?: boolean;
}

/** Rounded tile with the category glyph on its accent colour. */
export function CategoryIcon({ category, size = 'md', dimmed = false }: Props) {
  const { icon: Icon } = categoryMeta(category);
  return (
    <span className={`category-icon category-icon--${size} category-icon--${category}${dimmed ? ' is-dimmed' : ''}`} aria-hidden>
      <Icon strokeWidth={2.2} />
    </span>
  );
}
