import { Habit, HabitLog, HabitSection, toFilledIconName } from '@/types';
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
  active_months: number[] | null;
  section_id: string | null;
  sort_order: number | null;
};

type SectionRow = {
  id: string;
  name: string;
  sort_order: number | null;
};

type LogRow = {
  habit_id: string;
  date: string;
  count: number;
};

const ROUTINE_CATEGORY = '__routine__';

let outlineColumnsReady = true;

function packCategory(category: string, sectionId: string | null, sortOrder: number): string {
  if (!sectionId && sortOrder === 0) return category;
  return `${category}::${sectionId ?? ''}::${sortOrder}`;
}

function unpackCategory(category: string): {
  category: string;
  sectionId: string | null;
  sortOrder: number;
} {
  const parts = category.split('::');
  if (parts.length < 3) return { category, sectionId: null, sortOrder: 0 };
  const sortOrder = Number(parts[parts.length - 1]);
  const sectionId = parts[parts.length - 2] || null;
  return {
    category: parts.slice(0, -2).join('::'),
    sectionId,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

function habitToRow(habit: Habit, userId: string) {
  const category = outlineColumnsReady
    ? habit.category
    : packCategory(habit.category, habit.sectionId, habit.sortOrder);
  return {
    id: habit.id,
    user_id: userId,
    name: habit.name,
    category,
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
    ...(outlineColumnsReady
      ? {
          active_months: habit.activeMonths,
          section_id: habit.sectionId,
          sort_order: habit.sortOrder,
        }
      : {}),
  };
}

function sectionToRow(section: HabitSection, userId: string) {
  return {
    id: section.id,
    user_id: userId,
    name: section.name,
    sort_order: section.sortOrder,
  };
}

function rowToHabit(row: HabitRow): Habit {
  const packed = outlineColumnsReady
    ? { category: row.category, sectionId: row.section_id, sortOrder: row.sort_order ?? 0 }
    : unpackCategory(row.category);
  return normalizeHabitOccurrence({
    id: row.id,
    name: row.name,
    category: packed.category,
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
    activeMonths: row.active_months ?? undefined,
    sectionId: packed.sectionId,
    sortOrder: packed.sortOrder,
  });
}

function rowToSection(row: SectionRow): HabitSection {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? 0,
  };
}

export async function fetchUserHabits(userId: string): Promise<{
  habits: Habit[];
  logs: HabitLog[];
  sections: HabitSection[];
  inactiveIds: string[];
}> {
  const logsRequest = supabase.from('habit_logs').select('habit_id, date, count').eq('user_id', userId);
  const orderedHabits = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  outlineColumnsReady = !orderedHabits.error;
  const habitsRequest = outlineColumnsReady
    ? orderedHabits
    : await supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (!outlineColumnsReady) {
    console.warn(
      'Habit routines need supabase/migration_routines_and_months.sql. Existing habits still load.',
    );
  }
  const sectionsRequest = await supabase
    .from('habit_sections')
    .select('id, name, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  const { data: logRows, error: logError } = await logsRequest;

  if (habitsRequest.error) throw habitsRequest.error;
  if (logError) throw logError;

  const habitRows = habitsRequest.data;
  const sectionRows = sectionsRequest.error ? [] : sectionsRequest.data;

  const rows = (habitRows ?? []) as HabitRow[];
  const routineRows = outlineColumnsReady ? [] : rows.filter((row) => row.category === ROUTINE_CATEGORY);
  const habitSource = outlineColumnsReady ? rows : rows.filter((row) => row.category !== ROUTINE_CATEGORY);
  const inactiveIds = habitSource.filter((row) => row.is_active === false).map((row) => row.id);
  const habits = habitSource.map(rowToHabit);
  const logs: HabitLog[] = ((logRows ?? []) as LogRow[]).map((row) => ({
    habitId: row.habit_id,
    date: row.date,
    count: row.count,
  }));

  const sections = outlineColumnsReady
    ? ((sectionRows ?? []) as SectionRow[]).map(rowToSection)
    : routineRows.map((row) => ({
        id: row.id,
        name: row.name,
        sortOrder: row.weekdays?.[0] ?? 0,
      }));

  return { habits, logs, sections, inactiveIds };
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

export async function upsertSection(userId: string, section: HabitSection): Promise<void> {
  if (outlineColumnsReady) {
    const { error } = await supabase.from('habit_sections').upsert(sectionToRow(section, userId));
    if (!error) return;
  }

  const { error } = await supabase.from('habits').upsert({
    id: section.id,
    user_id: userId,
    name: section.name,
    category: ROUTINE_CATEGORY,
    target_daily_count: 1,
    color: '#3f6f6b',
    icon: 'albums',
    is_active: true,
    occurrence: 'daily',
    weekdays: [section.sortOrder],
    month_days: [],
    ended_at: null,
    skipped_dates: [],
  });
  if (error) throw error;
}

export async function deleteSectionRemote(userId: string, sectionId: string): Promise<void> {
  if (outlineColumnsReady) {
    const { error } = await supabase.from('habit_sections').delete().eq('user_id', userId).eq('id', sectionId);
    if (!error) return;
  }

  const { error } = await supabase.from('habits').delete().eq('user_id', userId).eq('id', sectionId);
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
