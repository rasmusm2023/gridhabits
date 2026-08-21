import { Habit, HabitLog } from '@/types';
import { addDays, startOfDay, toDateKey } from '@/utils/dates';

export const HEATMAP_WEEKS = 52;
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
  const active = habits.filter((habit) => habit.isActive);
  if (active.length === 0) {
    return 0;
  }

  const total = active.reduce((sum, habit) => {
    const count = logIndex.get(logKey(habit.id, dateKey)) ?? 0;
    return sum + getHabitProgress(habit, count);
  }, 0);

  return total / active.length;
}

export function getCompletedHabitCount(
  dateKey: string,
  habits: Habit[],
  logIndex: Map<string, number>,
): { completed: number; total: number } {
  const active = habits.filter((habit) => habit.isActive);
  const completed = active.filter((habit) => {
    const count = logIndex.get(logKey(habit.id, dateKey)) ?? 0;
    return getHabitProgress(habit, count) >= 1;
  }).length;

  return { completed, total: active.length };
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

export function getHeatmapColor(ratio: number, accent = DEFAULT_HEATMAP_COLOR): string {
  const level = getHeatLevel(ratio);
  if (level === 0) {
    return EMPTY_CELL_COLOR;
  }
  return mixHex(EMPTY_CELL_COLOR, accent, LEVEL_MIX[level]);
}

export type HeatmapWeek = Date[];

export function buildHeatmapWeeks(weekCount = HEATMAP_WEEKS, endDate = new Date()): HeatmapWeek[] {
  const today = startOfDay(endDate);
  const thisSunday = addDays(today, -today.getDay());
  const startSunday = addDays(thisSunday, -(weekCount - 1) * DAYS_IN_WEEK);
  const weeks: HeatmapWeek[] = [];

  for (let week = 0; week < weekCount; week += 1) {
    const days: Date[] = [];
    for (let day = 0; day < DAYS_IN_WEEK; day += 1) {
      days.push(addDays(startSunday, week * DAYS_IN_WEEK + day));
    }
    weeks.push(days);
  }

  return weeks;
}

export function getCurrentStreak(
  habits: Habit[],
  logIndex: Map<string, number>,
  now = new Date(),
): number {
  if (habits.filter((habit) => habit.isActive).length === 0) {
    return 0;
  }

  let cursor = startOfDay(now);
  if (getDayCompletionRatio(toDateKey(cursor), habits, logIndex) < 1) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (getDayCompletionRatio(toDateKey(cursor), habits, logIndex) >= 1) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
