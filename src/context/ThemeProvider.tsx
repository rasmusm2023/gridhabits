import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, Platform, StatusBar as RNStatusBar } from 'react-native';

import {
  Themes,
  isColorScheme,
  type ColorScheme,
  type ThemeColors,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  isDark: boolean;
  setColorScheme: (scheme: ColorScheme) => Promise<{ error: string | null }>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function storageKey(userId: string) {
  return `gridhabits.colorScheme.${userId}`;
}

function getDeviceColorScheme(): ColorScheme {
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

function readSchemeFromUser(
  user: { user_metadata?: Record<string, unknown> } | null,
): ColorScheme | null {
  const raw = user?.user_metadata?.color_scheme;
  return isColorScheme(raw) ? raw : null;
}

function applyWebThemeColor(background: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', background);
  document.documentElement.style.backgroundColor = background;
  document.body.style.backgroundColor = background;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, updateColorScheme } = useAuth();
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getDeviceColorScheme);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const fromUser = readSchemeFromUser(user);
      if (fromUser) {
        if (!cancelled) setColorSchemeState(fromUser);
        if (user?.id) {
          await AsyncStorage.setItem(storageKey(user.id), fromUser);
        }
        return;
      }

      if (user?.id) {
        const cached = await AsyncStorage.getItem(storageKey(user.id));
        if (cancelled) return;
        if (isColorScheme(cached)) {
          setColorSchemeState(cached);
          return;
        }
      }

      if (!cancelled) setColorSchemeState(getDeviceColorScheme());
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const colors = Themes[colorScheme];
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    applyWebThemeColor(colors.background);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(colors.background);
      RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    }
  }, [colors.background, isDark]);

  const setColorScheme = useCallback(
    async (next: ColorScheme) => {
      setColorSchemeState(next);
      if (user?.id) {
        await AsyncStorage.setItem(storageKey(user.id), next);
      }
      if (!user) {
        return { error: null };
      }
      return updateColorScheme(next);
    },
    [user, updateColorScheme],
  );

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        primary: colors.accent,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, isDark]);

  const value = useMemo(
    () => ({
      colorScheme,
      colors,
      isDark,
      setColorScheme,
    }),
    [colorScheme, colors, isDark, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
