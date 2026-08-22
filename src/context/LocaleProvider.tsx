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

import { useAuth } from '@/context/AuthProvider';
import {
  getDeviceLocale,
  isAppLocale,
  LOCALE_TAG,
  translate,
  type AppLocale,
  type TranslationKey,
} from '@/i18n';

type LocaleContextValue = {
  locale: AppLocale;
  localeTag: string;
  setLocale: (locale: AppLocale) => Promise<{ error: string | null }>;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function storageKey(userId: string) {
  return `gridhabits.locale.${userId}`;
}

function readLocaleFromUser(user: { user_metadata?: Record<string, unknown> } | null): AppLocale | null {
  const raw = user?.user_metadata?.locale;
  return isAppLocale(raw) ? raw : null;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user, updateLocale } = useAuth();
  const [locale, setLocaleState] = useState<AppLocale>(getDeviceLocale);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const fromUser = readLocaleFromUser(user);
      if (fromUser) {
        if (!cancelled) setLocaleState(fromUser);
        if (user?.id) {
          await AsyncStorage.setItem(storageKey(user.id), fromUser);
        }
        return;
      }

      if (user?.id) {
        const cached = await AsyncStorage.getItem(storageKey(user.id));
        if (cancelled) return;
        if (isAppLocale(cached)) {
          setLocaleState(cached);
          return;
        }
      }

      if (!cancelled) setLocaleState(getDeviceLocale());
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setLocale = useCallback(
    async (next: AppLocale) => {
      setLocaleState(next);
      if (user?.id) {
        await AsyncStorage.setItem(storageKey(user.id), next);
      }
      if (!user) {
        return { error: null };
      }
      return updateLocale(next);
    },
    [user, updateLocale],
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      localeTag: LOCALE_TAG[locale],
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
