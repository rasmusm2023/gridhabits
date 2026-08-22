import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { Habit, HabitLog } from '@/types';
import { todayKey } from '@/utils/dates';
import {
  getHabitProgress,
  indexLogs,
  logKey,
} from '@/utils/heatmap';
import { getActiveHabitsForDate } from '@/utils/occurrence';
import type { TranslationKey } from '@/i18n';

export const EVENING_REMINDER_ID = 'evening-habit-reminder';
export const EVENING_CHANNEL_ID = 'evening-reminders';
export const EVENING_HOUR = 18;
export const EVENING_MINUTE = 0;

export function notificationsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function configureNotificationHandler() {
  if (!notificationsSupported()) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureEveningChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(EVENING_CHANNEL_ID, {
    name: 'Evening reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function getNotificationPermissionGranted(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const settings = await Notifications.getPermissionsAsync();
  return (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  await ensureEveningChannel();
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export function getIncompleteHabitsForDate(
  habits: Habit[],
  logs: HabitLog[],
  date: string = todayKey(),
): Habit[] {
  const logIndex = indexLogs(logs);
  return getActiveHabitsForDate(habits, date).filter((habit) => {
    const count = logIndex.get(logKey(habit.id, date)) ?? 0;
    return getHabitProgress(habit, count) < 1;
  });
}

function buildReminderBody(
  names: string[],
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string {
  if (names.length === 1) {
    return t('notifications.eveningBodyOne', { name: names[0] });
  }
  if (names.length <= 3) {
    return t('notifications.eveningBodyList', { names: names.join(', ') });
  }
  const shown = names.slice(0, 2).join(', ');
  return t('notifications.eveningBodyMany', {
    count: names.length,
    names: shown,
  });
}

export async function cancelEveningReminder() {
  if (!notificationsSupported()) return;
  await Notifications.cancelScheduledNotificationAsync(EVENING_REMINDER_ID).catch(() => {
    // No-op if nothing was scheduled.
  });
}

type SyncArgs = {
  enabled: boolean;
  habits: Habit[];
  logs: HabitLog[];
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

/**
 * Keeps a daily 18:00 local notification in sync with incomplete habits.
 * Content is refreshed whenever the app syncs (open / habit changes).
 */
export async function syncEveningReminder({ enabled, habits, logs, t }: SyncArgs) {
  if (!notificationsSupported()) return;

  if (!enabled) {
    await cancelEveningReminder();
    return;
  }

  const granted = await getNotificationPermissionGranted();
  if (!granted) {
    await cancelEveningReminder();
    return;
  }

  const incomplete = getIncompleteHabitsForDate(habits, logs);
  if (incomplete.length === 0) {
    await cancelEveningReminder();
    return;
  }

  await ensureEveningChannel();
  await cancelEveningReminder();

  const names = incomplete.map((habit) => habit.name);
  await Notifications.scheduleNotificationAsync({
    identifier: EVENING_REMINDER_ID,
    content: {
      title: t('notifications.eveningTitle'),
      body: buildReminderBody(names, t),
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: EVENING_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: EVENING_HOUR,
      minute: EVENING_MINUTE,
      ...(Platform.OS === 'android' ? { channelId: EVENING_CHANNEL_ID } : {}),
    },
  });
}
