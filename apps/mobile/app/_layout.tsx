import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useFonts } from '@/hooks/useFonts';
import { useNotificationSetup } from '@/hooks/useNotificationSetup';
import { localDatabase } from '@/services/offline/database';
import { syncService } from '@/services/offline/syncService';
import { notificationService } from '@/services/notifications';
import { widgetService } from '@/services/widgetService';
import { biometricAuthService } from '@/services/biometricAuth';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts();
  
  useNotificationSetup();

  useEffect(() => {
    if (fontsLoaded) {
      initializeApp();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const initializeApp = async () => {
    try {
      // Initialize core services
      await localDatabase.initialize();
      await syncService.initialize();
      await notificationService.initialize();
      await widgetService.initialize();
      await biometricAuthService.initialize();

      console.log('Mobile app initialized successfully');
    } catch (error) {
      console.error('Failed to initialize mobile app:', error);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade',
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
              <StatusBar style="auto" />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}