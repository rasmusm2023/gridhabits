import AsyncStorage from '@react-native-async-storage/async-storage';

import { Habit, HabitLog } from '@/types';
import { createId } from '@/utils/ids';
import { defaultOccurrenceFields, normalizeHabitOccurrence } from '@/utils/occurrence';

const STORAGE_KEY = '@gridhabits/state';
const STORAGE_VERSION = 2;

export type PersistedState = {
  version: number;
  habits: Habit[];
  logs: HabitLog[];
};

export function createDefaultHabits(): Habit[] {
  const createdAt = new Date().toISOString();
  const occurrence = defaultOccurrenceFields('daily');

  return [
    {
      id: createId(),
      name: 'Medicine',
      category: 'Health',
      targetDailyCount: 1,
      color: '#a78bfa',
      icon: 'medkit',
      createdAt,
      isActive: true,
      ...occurrence,
    },
    {
      id: createId(),
      name: 'Vitamins',
      category: 'Health',
      targetDailyCount: 1,
      color: '#34d399',
      icon: 'leaf',
      createdAt,
      isActive: true,
      ...occurrence,
    },
    {
      id: createId(),
      name: 'Teeth',
      category: 'Hygiene',
      targetDailyCount: 2,
      color: '#22d3ee',
      icon: 'sparkles',
      createdAt,
      isActive: true,
      ...occurrence,
    },
  ];
}

function normalizeHabits(habits: unknown): Habit[] {
  if (!Array.isArray(habits)) {
    return createDefaultHabits();
  }

  return habits.map((item) => {
    const raw = item as Partial<Habit>;
    return normalizeHabitOccurrence({
      id: typeof raw.id === 'string' ? raw.id : createId(),
      name: typeof raw.name === 'string' ? raw.name : 'Habit',
      category: typeof raw.category === 'string' ? raw.category : 'Other',
      targetDailyCount:
        typeof raw.targetDailyCount === 'number' ? Math.max(1, raw.targetDailyCount) : 1,
      color: typeof raw.color === 'string' ? raw.color : '#4ade80',
      icon: typeof raw.icon === 'string' ? raw.icon.replace(/-outline$/u, '') : 'leaf',
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      isActive: true,
      occurrence: raw.occurrence,
      weekdays: raw.weekdays,
      monthDays: raw.monthDays,
      endedAt: raw.endedAt ?? null,
      skippedDates: raw.skippedDates ?? [],
    });
  });
}

export async function loadState(): Promise<PersistedState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      version: STORAGE_VERSION,
      habits: createDefaultHabits(),
      logs: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      version: STORAGE_VERSION,
      habits: normalizeHabits(parsed.habits),
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return {
      version: STORAGE_VERSION,
      habits: createDefaultHabits(),
      logs: [],
    };
  }
}

export async function saveState(state: Omit<PersistedState, 'version'>): Promise<void> {
  const payload: PersistedState = {
    version: STORAGE_VERSION,
    habits: state.habits,
    logs: state.logs,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
