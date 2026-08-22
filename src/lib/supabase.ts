import 'expo-sqlite/localStorage/install';

import { createClient, type SupportedStorage, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

function normalizeSupabaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // Users sometimes paste the REST endpoint; the client wants the project root URL.
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

const memoryStorage: SupportedStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function getAuthStorage(): SupportedStorage {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // SSR / restricted environments
  }
  return memoryStorage;
}

const supabaseUrl = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

if (!isSupabaseConfigured()) {
  console.warn(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in project-root .env.local. Restart Expo after adding them.',
  );
}

// Placeholder values keep createClient from throwing when env is missing;
// auth UI will show a configuration warning instead.
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseKey ?? 'placeholder-key',
  {
    auth: {
      storage: getAuthStorage(),
      autoRefreshToken: true,
      persistSession: true,
      // Web needs URL detection for email links; native uses deep links separately.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);

if (isSupabaseConfigured() && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
