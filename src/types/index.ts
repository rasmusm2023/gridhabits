export interface Habit {
  id: string;
  name: string;
  category: string;
  targetDailyCount: number;
  color: string;
  icon: string;
  createdAt: string;
  isActive: boolean;
}

export interface HabitLog {
  habitId: string;
  date: string;
  count: number;
}

export type HabitDraft = Omit<Habit, 'id' | 'createdAt'>;

export const HABIT_CATEGORIES = ['Health', 'Hygiene', 'Fitness', 'Mind', 'Other'] as const;
export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export const HABIT_ICONS = [
  'medkit-outline',
  'leaf-outline',
  'sparkles-outline',
  'water-outline',
  'barbell-outline',
  'book-outline',
  'moon-outline',
  'heart-outline',
  'walk-outline',
  'cafe-outline',
] as const;

export const HABIT_COLORS = [
  '#22c55e',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#fb7185',
  '#fbbf24',
  '#fb923c',
] as const;
