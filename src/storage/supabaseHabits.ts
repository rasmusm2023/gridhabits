import { Habit, HabitLog, toFilledIconName } from '@/types';
import { supabase } from '@/lib/supabase';
import { createDefaultHabits } from '@/storage/habitStorage';
import { normalizeHabitOccurrence } from '@/utils/occurrence';

type HabitRow = {
  id: string;
  name: string;
  category: string;
  target_daily_count: number;
  color: string;
  icon: string;
  created_at: string;
  is_active: boolean;
  occurrence: string | null;
  weekdays: number[] | null;
  month_days: number[] | null;
  ended_at: string | null;
  skipped_dates: string[] | null;
};

type LogRow = {
  habit_id: string;
  date: string;
  count: number;
};

function habitToRow(habit: Habit, userId: string) {
  return {
    id: habit.id,
    user_id: userId,
    name: habit.name,
    category: habit.category,
    target_daily_count: habit.targetDailyCount,
    color: habit.color,
    icon: habit.icon,
    created_at: habit.createdAt,
    is_active: habit.isActive,
    occurrence: habit.occurrence,
    weekdays: habit.weekdays,
    month_days: habit.monthDays,
    ended_at: habit.endedAt,
    skipped_dates: habit.skippedDates,
  };
}

function rowToHabit(row: HabitRow): Habit {
  return normalizeHabitOccurrence({
    id: row.id,
    name: row.name,
    category: row.category,
    targetDailyCount: row.target_daily_count,
    color: row.color,
    icon: toFilledIconName(row.icon),
    createdAt: row.created_at,
    isActive: true,
    occurrence: row.occurrence as Habit['occurrence'],
    weekdays: row.weekdays ?? [],
    monthDays: row.month_days ?? [],
    endedAt: row.ended_at,
    skippedDates: row.skipped_dates ?? [],
  });
}

export async function fetchUserHabits(userId: string): Promise<{
  habits: Habit[];
  logs: HabitLog[];
  inactiveIds: string[];
}> {
  const [{ data: habitRows, error: habitError }, { data: logRows, error: logError }] =
    await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('habit_logs').select('habit_id, date, count').eq('user_id', userId),
    ]);

  if (habitError) throw habitError;
  if (logError) throw logError;

  const rows = (habitRows ?? []) as HabitRow[];
  const inactiveIds = rows.filter((row) => row.is_active === false).map((row) => row.id);
  const habits = rows.map(rowToHabit);
  const logs: HabitLog[] = ((logRows ?? []) as LogRow[]).map((row) => ({
    habitId: row.habit_id,
    date: row.date,
    count: row.count,
  }));

  return { habits, logs, inactiveIds };
}

export async function seedDefaultHabits(userId: string): Promise<Habit[]> {
  const defaults = createDefaultHabits();
  const { error } = await supabase.from('habits').insert(defaults.map((habit) => habitToRow(habit, userId)));
  if (error) throw error;
  return defaults;
}

export async function upsertHabit(userId: string, habit: Habit): Promise<void> {
  const { error } = await supabase.from('habits').upsert(habitToRow(habit, userId));
  if (error) throw error;
}

export async function deleteHabitRemote(userId: string, habitId: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('user_id', userId).eq('id', habitId);
  if (error) throw error;
}

export async function deleteHabitLogsFromDate(
  userId: string,
  habitId: string,
  fromDate: string,
): Promise<void> {
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .gte('date', fromDate);
  if (error) throw error;
}

export async function upsertHabitLog(
  userId: string,
  habitId: string,
  date: string,
  count: number,
): Promise<void> {
  if (count <= 0) {
    const { error } = await supabase
      .from('habit_logs')
      .delete()
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('date', date);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('habit_logs').upsert(
    {
      user_id: userId,
      habit_id: habitId,
      date,
      count,
    },
    { onConflict: 'habit_id,date' },
  );
  if (error) throw error;
}
