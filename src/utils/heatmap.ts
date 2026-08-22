import { Habit, HabitLog } from '@/types';
import { addDays, startOfDay, startOfWeekMonday, toDateKey } from '@/utils/dates';
import { getActiveHabitsForDate } from '@/utils/occurrence';

export const HEATMAP_PAST_WEEKS = 26;
export const HEATMAP_FUTURE_WEEKS = 26;
export const HEATMAP_WEEKS = HEATMAP_PAST_WEEKS + 1 + HEATMAP_FUTURE_WEEKS;
export const DAYS_IN_WEEK = 7;
export const EMPTY_CELL_COLOR = '#21262d';
export const DEFAULT_HEATMAP_COLOR = '#4ade80';

export function logKey(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

export function indexLogs(logs: HabitLog[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const log of logs) {
    map.set(logKey(log.habitId, log.date), log.count);
  }
  return map;
}

export function getHabitProgress(habit: Habit, count: number): number {
  const target = Math.max(habit.targetDailyCount, 1);
  return Math.min(count / target, 1);
}

export function getDayCompletionRatio(
  dateKey: string,
  habits: Habit[],
  logIndex: Map<string, number>,
): number {
  const scheduled = getActiveHabitsForDate(habits, dateKey);
  if (scheduled.length === 0) {
    return 0;
  }

  const total = scheduled.reduce((sum, habit) => {
    const count = logIndex.get(logKey(habit.id, dateKey)) ?? 0;
    return sum + getHabitProgress(habit, count);
  }, 0);

  return total / scheduled.length;
}

export function getCompletedHabitCount(
  dateKey: string,
  habits: Habit[],
  logIndex: Map<string, number>,
): { completed: number; total: number } {
  const scheduled = getActiveHabitsForDate(habits, dateKey);
  const completed = scheduled.filter((habit) => {
    const count = logIndex.get(logKey(habit.id, dateKey)) ?? 0;
    return getHabitProgress(habit, count) >= 1;
  }).length;

  return { completed, total: scheduled.length };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function mixHex(from: string, to: string, amount: number): string {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const t = Math.min(Math.max(amount, 0), 1);
  return rgbToHex(
    Math.round(start.r + (end.r - start.r) * t),
    Math.round(start.g + (end.g - start.g) * t),
    Math.round(start.b + (end.b - start.b) * t),
  );
}

export function getHeatLevel(ratio: number): 0 | 1 | 2 | 3 | 4 {
  if (ratio <= 0) return 0;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const LEVEL_MIX = [0, 0.28, 0.5, 0.75, 1] as const;

export function getHeatmapColor(
  ratio: number,
  accent = DEFAULT_HEATMAP_COLOR,
  emptyCell = EMPTY_CELL_COLOR,
): string {
  const level = getHeatLevel(ratio);
  if (level === 0) {
    return emptyCell;
  }
  return mixHex(emptyCell, accent, LEVEL_MIX[level]);
}

export type HeatmapWeek = Date[];

export function buildHeatmapWeeks(
  pastWeeks = HEATMAP_PAST_WEEKS,
  futureWeeks = HEATMAP_FUTURE_WEEKS,
  centerDate = new Date(),
): HeatmapWeek[] {
  const thisMonday = startOfWeekMonday(centerDate);
  const startMonday = addDays(thisMonday, -pastWeeks * DAYS_IN_WEEK);
  const weekCount = pastWeeks + 1 + futureWeeks;
  const weeks: HeatmapWeek[] = [];

  for (let week = 0; week < weekCount; week += 1) {
    const days: Date[] = [];
    for (let day = 0; day < DAYS_IN_WEEK; day += 1) {
      days.push(addDays(startMonday, week * DAYS_IN_WEEK + day));
    }
    weeks.push(days);
  }

  return weeks;
}

/** Full calendar-year grid (Mon-start weeks covering Jan 1 … Dec 31). */
export function buildHeatmapWeeksForYear(year: number): HeatmapWeek[] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  let cursor = startOfWeekMonday(jan1);
  const lastMonday = startOfWeekMonday(dec31);
  const weeks: HeatmapWeek[] = [];

  while (cursor.getTime() <= lastMonday.getTime()) {
    const days: Date[] = [];
    for (let day = 0; day < DAYS_IN_WEEK; day += 1) {
      days.push(addDays(cursor, day));
    }
    weeks.push(days);
    cursor = addDays(cursor, DAYS_IN_WEEK);
  }

  return weeks;
}

export function findWeekIndexForDate(weeks: HeatmapWeek[], date: Date): number {
  const key = toDateKey(startOfDay(date));
  const index = weeks.findIndex((week) => week.some((day) => toDateKey(day) === key));
  return index >= 0 ? index : 0;
}

/**
 * Years the user can browse: from earliest tracking signal through the current year.
 * Prefer account creation, then habit creation, then earliest log date.
 */
export function getAvailableTrackingYears(options: {
  userCreatedAt?: string | null;
  habits: Habit[];
  logs: HabitLog[];
  now?: Date;
}): number[] {
  const now = options.now ?? new Date();
  const currentYear = now.getFullYear();
  let startYear = currentYear;

  if (options.userCreatedAt) {
    const parsed = new Date(options.userCreatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      startYear = Math.min(startYear, parsed.getFullYear());
    }
  }

  for (const habit of options.habits) {
    const parsed = new Date(habit.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      startYear = Math.min(startYear, parsed.getFullYear());
    }
  }

  for (const log of options.logs) {
    const year = Number.parseInt(log.date.slice(0, 4), 10);
    if (Number.isFinite(year)) {
      startYear = Math.min(startYear, year);
    }
  }

  const years: number[] = [];
  for (let year = currentYear; year >= startYear; year -= 1) {
    years.push(year);
  }
  return years;
}

export function getCurrentStreak(
  habits: Habit[],
  logIndex: Map<string, number>,
  now = new Date(),
): number {
  if (habits.length === 0) {
    return 0;
  }

  let cursor = startOfDay(now);
  const todayKeyValue = toDateKey(cursor);
  const todayScheduled = getActiveHabitsForDate(habits, todayKeyValue);
  if (
    todayScheduled.length > 0 &&
    getDayCompletionRatio(todayKeyValue, habits, logIndex) < 1
  ) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  let scanned = 0;
  const maxScan = 400;

  while (scanned < maxScan) {
    scanned += 1;
    const key = toDateKey(cursor);
    const scheduled = getActiveHabitsForDate(habits, key);

    if (scheduled.length === 0) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (getDayCompletionRatio(key, habits, logIndex) < 1) {
      break;
    }

    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
