import { Habit, HabitOccurrence } from '@/types';
import type { TranslationKey } from '@/i18n';
import { parseDateKey, toDateKey } from '@/utils/dates';

/** Monday → Sunday options for weekly pickers and heatmap. */
export const WEEKDAY_OPTIONS = [
  { labelKey: 'weekday.m' as const, shortKey: 'weekday.mon' as const, day: 1 },
  { labelKey: 'weekday.t' as const, shortKey: 'weekday.tue' as const, day: 2 },
  { labelKey: 'weekday.w' as const, shortKey: 'weekday.wed' as const, day: 3 },
  { labelKey: 'weekday.t' as const, shortKey: 'weekday.thu' as const, day: 4 },
  { labelKey: 'weekday.f' as const, shortKey: 'weekday.fri' as const, day: 5 },
  { labelKey: 'weekday.satLetter' as const, shortKey: 'weekday.sat' as const, day: 6 },
  { labelKey: 'weekday.sunLetter' as const, shortKey: 'weekday.sun' as const, day: 0 },
] as const;

export const OCCURRENCE_OPTIONS: { value: HabitOccurrence; labelKey: TranslationKey }[] = [
  { value: 'daily', labelKey: 'occurrence.daily' },
  { value: 'weekly', labelKey: 'occurrence.weekly' },
  { value: 'monthly', labelKey: 'occurrence.monthly' },
];

export const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const SEASON_PRESETS = [
  { id: 'spring', labelKey: 'season.spring' as const, months: [3, 4, 5] },
  { id: 'summer', labelKey: 'season.summer' as const, months: [6, 7, 8] },
  { id: 'autumn', labelKey: 'season.autumn' as const, months: [9, 10, 11] },
  { id: 'winter', labelKey: 'season.winter' as const, months: [12, 1, 2] },
] as const;

export function defaultOccurrenceFields(occurrence: HabitOccurrence = 'daily'): Pick<
  Habit,
  | 'occurrence'
  | 'weekdays'
  | 'monthDays'
  | 'endedAt'
  | 'skippedDates'
  | 'activeMonths'
  | 'sectionId'
  | 'sortOrder'
> {
  return {
    occurrence,
    weekdays: occurrence === 'weekly' ? [1] : [],
    monthDays: occurrence === 'monthly' ? [1] : [],
    endedAt: null,
    skippedDates: [],
    activeMonths: [...ALL_MONTHS],
    sectionId: null,
    sortOrder: 0,
  };
}

export function normalizeActiveMonths(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) return [...ALL_MONTHS];
  const months = [
    ...new Set(
      value.filter((month) => Number.isInteger(month) && month >= 1 && month <= 12),
    ),
  ].sort((a, b) => a - b);
  return months.length > 0 ? months : [...ALL_MONTHS];
}

export function isYearRound(months: number[]): boolean {
  return ALL_MONTHS.every((month) => months.includes(month));
}

export function sameMonths(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  const selected = new Set(left);
  return right.every((month) => selected.has(month));
}

export function normalizeHabitOccurrence(
  habit: Partial<Habit> &
    Pick<
      Habit,
      'id' | 'name' | 'category' | 'targetDailyCount' | 'color' | 'icon' | 'createdAt' | 'isActive'
    >,
): Habit {
  const occurrence: HabitOccurrence =
    habit.occurrence === 'weekly' || habit.occurrence === 'monthly' ? habit.occurrence : 'daily';

  const weekdays = Array.isArray(habit.weekdays)
    ? habit.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const monthDays = Array.isArray(habit.monthDays)
    ? habit.monthDays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 31)
    : [];
  const skippedDates = Array.isArray(habit.skippedDates)
    ? [...new Set(habit.skippedDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/u.test(date)))].sort()
    : [];
  const endedAt =
    typeof habit.endedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(habit.endedAt)
      ? habit.endedAt
      : null;
  const sectionId = typeof habit.sectionId === 'string' && habit.sectionId.length > 0 ? habit.sectionId : null;
  const sortOrder = typeof habit.sortOrder === 'number' && Number.isFinite(habit.sortOrder) ? habit.sortOrder : 0;

  return {
    ...habit,
    occurrence,
    weekdays: occurrence === 'weekly' ? (weekdays.length > 0 ? weekdays : [1]) : [],
    monthDays: occurrence === 'monthly' ? (monthDays.length > 0 ? monthDays : [1]) : [],
    endedAt,
    skippedDates,
    activeMonths: normalizeActiveMonths(habit.activeMonths),
    sectionId,
    sortOrder,
  };
}

export function isHabitScheduledOnDate(habit: Habit, date: Date | string): boolean {
  const resolved = typeof date === 'string' ? parseDateKey(date) : date;
  const key = typeof date === 'string' ? date : toDateKey(resolved);

  if (habit.endedAt && key >= habit.endedAt) {
    return false;
  }

  if (habit.skippedDates?.includes(key)) {
    return false;
  }

  const activeMonths = normalizeActiveMonths(habit.activeMonths);
  if (!activeMonths.includes(resolved.getMonth() + 1)) {
    return false;
  }

  switch (habit.occurrence ?? 'daily') {
    case 'weekly': {
      const days = habit.weekdays?.length ? habit.weekdays : [];
      return days.includes(resolved.getDay());
    }
    case 'monthly': {
      const days = habit.monthDays?.length ? habit.monthDays : [];
      return days.includes(resolved.getDate());
    }
    case 'daily':
    default:
      return true;
  }
}

export function getActiveHabitsForDate(habits: Habit[], date: Date | string): Habit[] {
  return habits.filter((habit) => isHabitScheduledOnDate(habit, date));
}

export function describeOccurrence(
  habit: Habit,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string {
  switch (habit.occurrence ?? 'daily') {
    case 'weekly': {
      const selected = new Set(habit.weekdays ?? []);
      const labels = WEEKDAY_OPTIONS.filter((option) => selected.has(option.day)).map((option) =>
        t(option.shortKey),
      );
      return labels.length > 0 ? labels.join(', ') : t('occurrence.weekly');
    }
    case 'monthly': {
      const days = [...(habit.monthDays ?? [])].sort((a, b) => a - b);
      if (days.length === 0) return t('occurrence.monthly');
      if (days.length <= 4) return days.map((day) => `${day}`).join(', ');
      return t('occurrence.daysPerMonth', { count: days.length });
    }
    default:
      return t('occurrence.daily');
  }
}

export function describeActiveMonths(
  habit: Habit,
  monthLabel: (month: number) => string,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string | null {
  const months = normalizeActiveMonths(habit.activeMonths);
  if (isYearRound(months)) return null;

  for (const season of SEASON_PRESETS) {
    if (sameMonths(months, season.months)) return t(season.labelKey);
  }

  return months.map((month) => monthLabel(month)).join(', ');
}
