import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider } from '@/context/AuthProvider';
import { HabitsProvider } from '@/context/HabitsProvider';
import { LocaleProvider } from '@/context/LocaleProvider';
import { ThemeProvider, useTheme } from '@/context/ThemeProvider';

import '@/global.css';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <LocaleProvider>
        <ThemeProvider>
          <HabitsProvider>
            <RootNavigator />
          </HabitsProvider>
        </ThemeProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
