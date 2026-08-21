import AsyncStorage from '@react-native-async-storage/async-storage';

import { Habit, HabitLog } from '@/types';
import { createId } from '@/utils/ids';

const STORAGE_KEY = '@gridhabits/state';
const STORAGE_VERSION = 1;

export type PersistedState = {
  version: number;
  habits: Habit[];
  logs: HabitLog[];
};

export function createDefaultHabits(): Habit[] {
  const createdAt = new Date().toISOString();

  return [
    {
      id: createId(),
      name: 'Medicine',
      category: 'Health',
      targetDailyCount: 1,
      color: '#a78bfa',
      icon: 'medkit-outline',
      createdAt,
      isActive: true,
    },
    {
      id: createId(),
      name: 'Vitamins',
      category: 'Health',
      targetDailyCount: 1,
      color: '#34d399',
      icon: 'leaf-outline',
      createdAt,
      isActive: true,
    },
    {
      id: createId(),
      name: 'Teeth',
      category: 'Hygiene',
      targetDailyCount: 2,
      color: '#22d3ee',
      icon: 'sparkles-outline',
      createdAt,
      isActive: true,
    },
  ];
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
      habits: Array.isArray(parsed.habits) ? parsed.habits : createDefaultHabits(),
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
