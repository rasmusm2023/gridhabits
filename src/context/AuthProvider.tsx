import { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getDeviceLocale, type AppLocale } from '@/i18n';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ColorScheme } from '@/constants/theme';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  updateFullName: (fullName: string) => Promise<{ error: string | null }>;
  updateLocale: (locale: AppLocale) => Promise<{ error: string | null }>;
  updateColorScheme: (colorScheme: ColorScheme) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const trimmedName = fullName.trim();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: 'gridhabits://auth/callback',
        data: {
          full_name: trimmedName,
          name: trimmedName,
          locale: getDeviceLocale(),
        },
      },
    });
    return {
      error: error?.message ?? null,
      needsEmailConfirmation: !error && !data.session,
    };
  }, []);

  const updateFullName = useCallback(async (fullName: string) => {
    const trimmedName = fullName.trim();
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        name: trimmedName,
      },
    });
    if (!error && data.user) {
      setSession((current) => (current ? { ...current, user: data.user } : current));
    }
    return { error: error?.message ?? null };
  }, []);

  const updateLocale = useCallback(async (locale: AppLocale) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { locale },
    });
    if (!error && data.user) {
      setSession((current) => (current ? { ...current, user: data.user } : current));
    }
    return { error: error?.message ?? null };
  }, []);

  const updateColorScheme = useCallback(async (colorScheme: ColorScheme) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { color_scheme: colorScheme },
    });
    if (!error && data.user) {
      setSession((current) => (current ? { ...current, user: data.user } : current));
    }
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: configured,
      signIn,
      signUp,
      updateFullName,
      updateLocale,
      updateColorScheme,
      signOut,
    }),
    [
      session,
      isLoading,
      configured,
      signIn,
      signUp,
      updateFullName,
      updateLocale,
      updateColorScheme,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
