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
import { Habit, HabitDraft, HabitLog, HabitSection } from '@/types';
import {
  deleteHabitLogsFromDate,
  deleteHabitRemote,
  deleteSectionRemote,
  fetchUserHabits,
  seedDefaultHabits,
  upsertHabit,
  upsertHabitLog,
  upsertSection,
} from '@/storage/supabaseHabits';
import { indexLogs, logKey } from '@/utils/heatmap';
import { createId } from '@/utils/ids';
import { normalizeHabitOccurrence } from '@/utils/occurrence';

export type HabitDeleteMode = 'once' | 'future' | 'entire';

type HabitsContextValue = {
  habits: Habit[];
  sections: HabitSection[];
  logs: HabitLog[];
  isReady: boolean;
  addHabit: (draft: HabitDraft) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => Promise<void>;
  deleteHabit: (id: string, mode: HabitDeleteMode, date: string) => Promise<void>;
  addSection: (name: string) => Promise<void>;
  renameSection: (id: string, name: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  saveOutline: (sections: HabitSection[], habits: Habit[]) => Promise<void>;
  incrementHabit: (habitId: string, date: string) => Promise<void>;
  getCount: (habitId: string, date: string) => number;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sections, setSections] = useState<HabitSection[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setHabits([]);
        setSections([]);
        setLogs([]);
        setIsReady(true);
        return;
      }

      setIsReady(false);
      try {
        let state = await fetchUserHabits(user.id);
        if (state.habits.length === 0) {
          const seeded = await seedDefaultHabits(user.id);
          state = { habits: seeded, logs: [], sections: [], inactiveIds: [] };
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
        setSections(state.sections);
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
              setSections(state.sections);
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
          setSections([]);
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
      const sectionId = draft.sectionId ?? null;
      const siblings = habits.filter((item) => item.sectionId === sectionId);
      const sortOrder =
        siblings.length === 0 ? 0 : Math.max(...siblings.map((item) => item.sortOrder)) + 1;
      const habit = normalizeHabitOccurrence({
        ...draft,
        id: createId(),
        createdAt: new Date().toISOString(),
        name: draft.name.trim(),
        targetDailyCount: Math.max(1, Math.round(draft.targetDailyCount)),
        endedAt: draft.endedAt ?? null,
        skippedDates: draft.skippedDates ?? [],
        sectionId,
        sortOrder,
      });
      setHabits((current) => [...current, habit]);
      try {
        await upsertHabit(user.id, habit);
      } catch (error) {
        console.warn('Failed to save habit', error);
        setHabits((current) => current.filter((item) => item.id !== habit.id));
      }
    },
    [user, habits],
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
          const sectionChanged =
            patch.sectionId !== undefined && patch.sectionId !== habit.sectionId;
          const siblings = sectionChanged
            ? current.filter((item) => item.id !== id && item.sectionId === (patch.sectionId ?? null))
            : [];
          nextHabit = normalizeHabitOccurrence({
            ...habit,
            ...patch,
            name: patch.name?.trim() ?? habit.name,
            targetDailyCount: Math.max(
              1,
              Math.round(patch.targetDailyCount ?? habit.targetDailyCount),
            ),
            sortOrder: sectionChanged
              ? siblings.length === 0
                ? 0
                : Math.max(...siblings.map((item) => item.sortOrder)) + 1
              : (patch.sortOrder ?? habit.sortOrder),
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

  const addSection = useCallback(
    async (name: string) => {
      if (!user) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const section: HabitSection = {
        id: createId(),
        name: trimmed,
        sortOrder: sections.length === 0 ? 0 : Math.max(...sections.map((item) => item.sortOrder)) + 1,
      };
      setSections((current) => [...current, section]);
      try {
        await upsertSection(user.id, section);
      } catch (error) {
        console.warn('Failed to save routine', error);
        setSections((current) => current.filter((item) => item.id !== section.id));
      }
    },
    [user, sections],
  );

  const renameSection = useCallback(
    async (id: string, name: string) => {
      if (!user) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      let previous: HabitSection | undefined;
      setSections((current) =>
        current.map((section) => {
          if (section.id !== id) return section;
          previous = section;
          return { ...section, name: trimmed };
        }),
      );
      if (!previous) return;
      try {
        await upsertSection(user.id, { ...previous, name: trimmed });
      } catch (error) {
        console.warn('Failed to rename routine', error);
        setSections((current) => current.map((section) => (section.id === id ? previous! : section)));
      }
    },
    [user],
  );

  const deleteSection = useCallback(
    async (id: string) => {
      if (!user) return;
      const previousSections = sections;
      const previousHabits = habits;
      const nextSections = sections.filter((section) => section.id !== id);
      const nextHabits = habits.map((habit) =>
        habit.sectionId === id ? { ...habit, sectionId: null } : habit,
      );
      setSections(nextSections);
      setHabits(nextHabits);
      try {
        await Promise.all(
          nextHabits
            .filter((habit) => habit.sectionId === null && previousHabits.find((item) => item.id === habit.id)?.sectionId === id)
            .map((habit) => upsertHabit(user.id, habit)),
        );
        await deleteSectionRemote(user.id, id);
      } catch (error) {
        console.warn('Failed to delete routine', error);
        setSections(previousSections);
        setHabits(previousHabits);
      }
    },
    [user, sections, habits],
  );

  const saveOutline = useCallback(
    async (nextSections: HabitSection[], nextHabits: Habit[]) => {
      if (!user) return;
      const previousSections = sections;
      const previousHabits = habits;
      setSections(nextSections);
      setHabits(nextHabits);
      try {
        const changedHabits = nextHabits.filter((habit) => {
          const previous = previousHabits.find((item) => item.id === habit.id);
          return (
            !previous ||
            previous.sectionId !== habit.sectionId ||
            previous.sortOrder !== habit.sortOrder
          );
        });
        await Promise.all([
          ...nextSections.map((section) => upsertSection(user.id, section)),
          ...changedHabits.map((habit) => upsertHabit(user.id, habit)),
        ]);
      } catch (error) {
        console.warn('Failed to save habit order', error);
        setSections(previousSections);
        setHabits(previousHabits);
      }
    },
    [user, sections, habits],
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
      sections,
      logs,
      isReady,
      addHabit,
      updateHabit,
      deleteHabit,
      addSection,
      renameSection,
      deleteSection,
      saveOutline,
      incrementHabit,
      getCount,
    }),
    [
      habits,
      sections,
      logs,
      isReady,
      addHabit,
      updateHabit,
      deleteHabit,
      addSection,
      renameSection,
      deleteSection,
      saveOutline,
      incrementHabit,
      getCount,
    ],
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
