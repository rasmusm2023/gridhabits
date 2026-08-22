import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/context/AuthProvider';
import { useHabits } from '@/context/HabitsProvider';
import { useLocale } from '@/context/LocaleProvider';
import {
  cancelEveningReminder,
  getNotificationPermissionGranted,
  notificationsSupported,
  requestNotificationPermission,
  syncEveningReminder,
} from '@/notifications/eveningReminder';

type NotificationPreferencesValue = {
  supported: boolean;
  ready: boolean;
  eveningReminderEnabled: boolean;
  setEveningReminderEnabled: (enabled: boolean) => Promise<{ error: string | null }>;
};

const NotificationPreferencesContext = createContext<NotificationPreferencesValue | null>(null);

function storageKey(userId: string) {
  return `gridhabits.eveningReminder.${userId}`;
}

export function NotificationPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { habits, logs, isReady: habitsReady } = useHabits();
  const { t } = useLocale();
  const supported = notificationsSupported();
  const [ready, setReady] = useState(!supported);
  const [eveningReminderEnabled, setEveningReminderEnabledState] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!supported) {
        if (!cancelled) {
          setEveningReminderEnabledState(false);
          setReady(true);
        }
        return;
      }

      if (!user?.id) {
        if (!cancelled) {
          setEveningReminderEnabledState(false);
          setReady(true);
        }
        await cancelEveningReminder();
        return;
      }

      setReady(false);
      try {
        const cached = await AsyncStorage.getItem(storageKey(user.id));
        // Opt-in via Settings so we can request permission in the same gesture.
        const enabled = cached === '1';
        if (!cancelled) {
          setEveningReminderEnabledState(enabled);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [supported, user?.id]);

  const setEveningReminderEnabled = useCallback(
    async (enabled: boolean) => {
      if (!supported) {
        return { error: 'unsupported' };
      }

      if (enabled) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setEveningReminderEnabledState(false);
          if (user?.id) {
            await AsyncStorage.setItem(storageKey(user.id), '0');
          }
          return { error: 'permission' };
        }
      }

      setEveningReminderEnabledState(enabled);
      if (user?.id) {
        await AsyncStorage.setItem(storageKey(user.id), enabled ? '1' : '0');
      }

      if (!enabled) {
        await cancelEveningReminder();
      }

      return { error: null };
    },
    [supported, user?.id],
  );

  useEffect(() => {
    if (!supported || !ready || !habitsReady) return;

    let cancelled = false;

    async function runSync() {
      if (cancelled) return;
      if (eveningReminderEnabled) {
        const granted = await getNotificationPermissionGranted();
        if (!granted) {
          // Keep preference on, but don't schedule until permission returns.
          await cancelEveningReminder();
          return;
        }
      }
      await syncEveningReminder({
        enabled: eveningReminderEnabled,
        habits,
        logs,
        t,
      });
    }

    void runSync();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runSync();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [
    supported,
    ready,
    habitsReady,
    eveningReminderEnabled,
    habits,
    logs,
    t,
  ]);

  const value = useMemo(
    () => ({
      supported: supported && Platform.OS !== 'web',
      ready,
      eveningReminderEnabled,
      setEveningReminderEnabled,
    }),
    [supported, ready, eveningReminderEnabled, setEveningReminderEnabled],
  );

  return (
    <NotificationPreferencesContext.Provider value={value}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
}

export function useNotificationPreferences() {
  const value = useContext(NotificationPreferencesContext);
  if (!value) {
    throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider');
  }
  return value;
}
