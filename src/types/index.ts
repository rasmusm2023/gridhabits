export type HabitOccurrence = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  name: string;
  category: string;
  targetDailyCount: number;
  color: string;
  icon: string;
  createdAt: string;
  isActive: boolean;
  /** How often the habit is expected. Defaults to daily for legacy data. */
  occurrence: HabitOccurrence;
  /** JS getDay() values (0=Sun … 6=Sat). Used when occurrence is weekly. */
  weekdays: number[];
  /** Calendar dates 1–31. Used when occurrence is monthly. */
  monthDays: number[];
  /** First date the habit no longer appears (this day and after are excluded). */
  endedAt: string | null;
  /** Specific YYYY-MM-DD dates skipped once (habit continues otherwise). */
  skippedDates: string[];
  /** Calendar months 1–12 when the habit is expected. All twelve means year-round. */
  activeMonths: number[];
  /** Routine this habit belongs to. Null keeps it outside any section. */
  sectionId: string | null;
  /** Order within its routine, or among ungrouped habits. */
  sortOrder: number;
}

export interface HabitSection {
  id: string;
  name: string;
  sortOrder: number;
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
  'medkit',
  'leaf',
  'sparkles',
  'water',
  'barbell',
  'book',
  'moon',
  'heart',
  'walk',
  'cafe',
] as const;

/** Prefer filled Ionicons glyphs; keeps older `-outline` habit data working. */
export function toFilledIconName(icon: string): string {
  return icon.replace(/-outline$/u, '').replace(/-sharp$/u, '');
}

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
