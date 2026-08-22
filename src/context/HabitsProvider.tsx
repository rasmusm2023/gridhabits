import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Habit, HabitDraft, HabitLog } from '@/types';
import {
  deleteHabitLogsFromDate,
  deleteHabitRemote,
  fetchUserHabits,
  seedDefaultHabits,
  upsertHabit,
  upsertHabitLog,
} from '@/storage/supabaseHabits';
import { indexLogs, logKey } from '@/utils/heatmap';
import { createId } from '@/utils/ids';
import { normalizeHabitOccurrence } from '@/utils/occurrence';

export type HabitDeleteMode = 'once' | 'future' | 'entire';

type HabitsContextValue = {
  habits: Habit[];
  logs: HabitLog[];
  isReady: boolean;
  addHabit: (draft: HabitDraft) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => Promise<void>;
  deleteHabit: (id: string, mode: HabitDeleteMode, date: string) => Promise<void>;
  incrementHabit: (habitId: string, date: string) => Promise<void>;
  getCount: (habitId: string, date: string) => number;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setHabits([]);
        setLogs([]);
        setIsReady(true);
        return;
      }

      setIsReady(false);
      try {
        let state = await fetchUserHabits(user.id);
        if (state.habits.length === 0) {
          const seeded = await seedDefaultHabits(user.id);
          state = { habits: seeded, logs: [], inactiveIds: [] };
        } else if (state.inactiveIds.length > 0) {
          const inactive = new Set(state.inactiveIds);
          await Promise.all(
            state.habits
              .filter((habit) => inactive.has(habit.id))
              .map((habit) => upsertHabit(user.id, { ...habit, isActive: true })),
          );
        }
        if (cancelled) return;
        setHabits(state.habits);
        setLogs(state.logs);
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: string }).code)
            : '';
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: string }).message)
            : '';
        const jwtSkew =
          code === 'PGRST303' || /jwt issued at future/i.test(message);

        if (jwtSkew) {
          try {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError) {
              const state = await fetchUserHabits(user.id);
              if (cancelled) return;
              setHabits(state.habits);
              setLogs(state.logs);
              return;
            }
          } catch (retryError) {
            console.warn('Failed to refresh session after JWT skew', retryError);
          }
        }

        console.warn('Failed to load habits from Supabase', error);
        if (!cancelled) {
          setHabits([]);
          setLogs([]);
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const addHabit = useCallback(
    async (draft: HabitDraft) => {
      if (!user) return;
      const habit = normalizeHabitOccurrence({
        ...draft,
        id: createId(),
        createdAt: new Date().toISOString(),
        name: draft.name.trim(),
        targetDailyCount: Math.max(1, Math.round(draft.targetDailyCount)),
        endedAt: draft.endedAt ?? null,
        skippedDates: draft.skippedDates ?? [],
      });
      setHabits((current) => [...current, habit]);
      try {
        await upsertHabit(user.id, habit);
      } catch (error) {
        console.warn('Failed to save habit', error);
        setHabits((current) => current.filter((item) => item.id !== habit.id));
      }
    },
    [user],
  );

  const updateHabit = useCallback(
    async (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => {
      if (!user) return;
      let previous: Habit | undefined;
      let nextHabit: Habit | undefined;

      setHabits((current) =>
        current.map((habit) => {
          if (habit.id !== id) return habit;
          previous = habit;
          nextHabit = normalizeHabitOccurrence({
            ...habit,
            ...patch,
            name: patch.name?.trim() ?? habit.name,
            targetDailyCount: Math.max(
              1,
              Math.round(patch.targetDailyCount ?? habit.targetDailyCount),
            ),
          });
          return nextHabit;
        }),
      );

      if (!nextHabit) return;
      try {
        await upsertHabit(user.id, nextHabit);
      } catch (error) {
        console.warn('Failed to update habit', error);
        if (previous) {
          setHabits((current) => current.map((habit) => (habit.id === id ? previous! : habit)));
        }
      }
    },
    [user],
  );

  const deleteHabit = useCallback(
    async (id: string, mode: HabitDeleteMode, date: string) => {
      if (!user) return;
      const previousHabits = habits;
      const previousLogs = logs;
      const existing = habits.find((habit) => habit.id === id);
      if (!existing) return;

      try {
        if (mode === 'entire') {
          setHabits((current) => current.filter((habit) => habit.id !== id));
          setLogs((current) => current.filter((log) => log.habitId !== id));
          await deleteHabitRemote(user.id, id);
          return;
        }

        if (mode === 'once') {
          const nextHabit = normalizeHabitOccurrence({
            ...existing,
            skippedDates: [...new Set([...(existing.skippedDates ?? []), date])].sort(),
          });
          setHabits((current) => current.map((habit) => (habit.id === id ? nextHabit : habit)));
          setLogs((current) =>
            current.filter((log) => !(log.habitId === id && log.date === date)),
          );
          await upsertHabit(user.id, nextHabit);
          await upsertHabitLog(user.id, id, date, 0);
          return;
        }

        // future: end series from this date onward; keep earlier history
        const nextHabit = normalizeHabitOccurrence({
          ...existing,
          endedAt: date,
          skippedDates: (existing.skippedDates ?? []).filter((item) => item < date),
        });
        setHabits((current) => current.map((habit) => (habit.id === id ? nextHabit : habit)));
        setLogs((current) =>
          current.filter((log) => !(log.habitId === id && log.date >= date)),
        );
        await upsertHabit(user.id, nextHabit);
        await deleteHabitLogsFromDate(user.id, id, date);
      } catch (error) {
        console.warn('Failed to delete habit', error);
        setHabits(previousHabits);
        setLogs(previousLogs);
      }
    },
    [user, habits, logs],
  );

  const incrementHabit = useCallback(
    async (habitId: string, date: string) => {
      if (!user) return;
      const habit = habits.find((item) => item.id === habitId);
      if (!habit) return;

      const target = Math.max(habit.targetDailyCount, 1);
      const existing = logs.find((log) => log.habitId === habitId && log.date === date);
      const nextCount = existing && existing.count >= target ? 0 : (existing?.count ?? 0) + 1;
      const previousLogs = logs;

      setLogs((current) => {
        if (nextCount === 0) {
          return current.filter((log) => !(log.habitId === habitId && log.date === date));
        }
        if (!existing) {
          return [...current, { habitId, date, count: nextCount }];
        }
        return current.map((log) =>
          log.habitId === habitId && log.date === date ? { ...log, count: nextCount } : log,
        );
      });

      try {
        await upsertHabitLog(user.id, habitId, date, nextCount);
      } catch (error) {
        console.warn('Failed to save habit log', error);
        setLogs(previousLogs);
      }
    },
    [user, habits, logs],
  );

  const logIndex = useMemo(() => indexLogs(logs), [logs]);

  const getCount = useCallback(
    (habitId: string, date: string) => logIndex.get(logKey(habitId, date)) ?? 0,
    [logIndex],
  );

  const value = useMemo(
    () => ({
      habits,
      logs,
      isReady,
      addHabit,
      updateHabit,
      deleteHabit,
      incrementHabit,
      getCount,
    }),
    [habits, logs, isReady, addHabit, updateHabit, deleteHabit, incrementHabit, getCount],
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits() {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useHabits must be used within HabitsProvider');
  }
  return context;
}
