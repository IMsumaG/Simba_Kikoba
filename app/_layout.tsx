import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../global.css';
import '../i18n';
import { AuthProvider, useAuth } from '../services/AuthContext';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../context/ThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

const SessionTimer = () => {
  const { timeRemaining, user } = useAuth();
  const segments = useSegments();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isAuthPage = segments[0] === '(auth)';
  if (!user || timeRemaining === undefined || isAuthPage) return null;

  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isWarning = timeRemaining < 60;

  return (
    <View style={{
      position: 'absolute',
      top: insets.top + 10,
      right: 16,
      zIndex: 9999,
    }}>
      <Text style={{
        color: isWarning ? '#EF4444' : colors.primary,
        fontSize: 14,
        fontWeight: '900'
      }}>
        {formatTime(timeRemaining)}
      </Text>
    </View>
  );
};

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to the login page if the user is not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to the home page if the user is authenticated
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return (
    <View style={{ flex: 1 }}>
      <SessionTimer />
      <CustomThemeProvider>
        <InnerRootLayoutNav />
      </CustomThemeProvider>
    </View>
  );
}

function InnerRootLayoutNav() {
  const { theme, colors } = useTheme();

  return (
    <ThemeProvider value={{
      ...DefaultTheme,
      dark: theme === 'dark',
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
        primary: colors.primary,
      },
    }}>
      <Stack>
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="member/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
