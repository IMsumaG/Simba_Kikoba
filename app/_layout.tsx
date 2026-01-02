import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../global.css';
import '../i18n';
import { AuthProvider, useAuth } from '../services/AuthContext';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
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
    <ThemeProvider value={{
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: '#FFFFFF',
        card: '#FFFFFF',
        text: '#0F172A',
        border: '#E2E8F0',
        notification: '#F57C00',
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
      <StatusBar style="dark" />
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
