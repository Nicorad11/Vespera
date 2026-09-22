import { BookOpen, LayoutGrid, MoonStar, Utensils, type LucideIcon } from 'lucide-react';
import type { MessageKey } from '../i18n/strings';
import type { Category, CategoryFilter } from '../models/types';

interface FilterMeta {
  icon: LucideIcon;
  label: MessageKey;
  /** CSS colour (a custom property) used for the accent. */
  color: string;
  ink: string;
}

export const FILTER_META: Record<CategoryFilter, FilterMeta> = {
  all: { icon: LayoutGrid, label: 'category.all', color: 'var(--accent)', ink: 'var(--accent-ink)' },
  food: { icon: Utensils, label: 'category.food', color: 'var(--food)', ink: 'var(--food-ink)' },
  study: { icon: BookOpen, label: 'category.study', color: 'var(--study)', ink: 'var(--study-ink)' },
  lateNight: { icon: MoonStar, label: 'category.lateNight', color: 'var(--lateNight)', ink: 'var(--lateNight-ink)' },
};

export const FILTER_ORDER: readonly CategoryFilter[] = ['all', 'food', 'study', 'lateNight'];

export function categoryMeta(category: Category): FilterMeta {
  return FILTER_META[category];
}
