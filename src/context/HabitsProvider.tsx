import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { loadState, saveState } from '@/storage/habitStorage';
import { Habit, HabitDraft, HabitLog } from '@/types';
import { createId } from '@/utils/ids';
import { indexLogs, logKey } from '@/utils/heatmap';

type HabitsContextValue = {
  habits: Habit[];
  logs: HabitLog[];
  isReady: boolean;
  addHabit: (draft: HabitDraft) => void;
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => void;
  deleteHabit: (id: string) => void;
  incrementHabit: (habitId: string, date: string) => void;
  getCount: (habitId: string, date: string) => number;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadState()
      .then((state) => {
        if (cancelled) return;
        setHabits(state.habits);
        setLogs(state.logs);
      })
      .catch((error) => {
        console.warn('Failed to load GridHabits state', error);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    saveState({ habits, logs }).catch((error) => {
      console.warn('Failed to save GridHabits state', error);
    });
  }, [habits, logs, isReady]);

  const addHabit = useCallback((draft: HabitDraft) => {
    const habit: Habit = {
      ...draft,
      id: createId(),
      createdAt: new Date().toISOString(),
      name: draft.name.trim(),
      targetDailyCount: Math.max(1, Math.round(draft.targetDailyCount)),
    };
    setHabits((current) => [...current, habit]);
  }, []);

  const updateHabit = useCallback(
    (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => {
      setHabits((current) =>
        current.map((habit) =>
          habit.id === id
            ? {
                ...habit,
                ...patch,
                name: patch.name?.trim() ?? habit.name,
                targetDailyCount: Math.max(
                  1,
                  Math.round(patch.targetDailyCount ?? habit.targetDailyCount),
                ),
              }
            : habit,
        ),
      );
    },
    [],
  );

  const deleteHabit = useCallback((id: string) => {
    setHabits((current) => current.filter((habit) => habit.id !== id));
    setLogs((current) => current.filter((log) => log.habitId !== id));
  }, []);

  const incrementHabit = useCallback((habitId: string, date: string) => {
    setLogs((current) => {
      const habit = habits.find((item) => item.id === habitId);
      if (!habit) return current;

      const target = Math.max(habit.targetDailyCount, 1);
      const existing = current.find((log) => log.habitId === habitId && log.date === date);
      const nextCount = existing && existing.count >= target ? 0 : (existing?.count ?? 0) + 1;

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
  }, [habits]);

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
