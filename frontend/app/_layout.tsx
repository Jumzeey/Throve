import { AuthProvider, useAuth } from '@/context/auth-context';
import { CheckoutProvider } from '@/context/checkout-context';
import { InboxProvider } from '@/context/inbox-context';
import { ListingsProvider } from '@/context/listings-context';
import { LiveProvider } from '@/context/live-context';
import { SplashScreen } from '@/components/ui/splash-screen';
import { Palette } from '@/constants/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import * as SystemUI from 'expo-system-ui';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';

const ThroveTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Palette.ivory,
    card: Palette.ivoryElevated,
    text: Palette.espresso,
    border: Palette.border,
    primary: Palette.plum,
  },
};

function RootNavigator() {
  const { isReady } = useAuth();

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="search" />
      <Stack.Screen name="category-browse" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="live" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="sell" />
      <Stack.Screen name="inbox" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="seller/[username]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      void SystemUI.setBackgroundColorAsync(Palette.ivoryElevated);
    }
  }, []);

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <ListingsProvider>
          <InboxProvider>
            <LiveProvider>
              <CheckoutProvider>
                <ThemeProvider value={ThroveTheme}>
                  <RootNavigator />
                  <StatusBar style="dark" />
                </ThemeProvider>
              </CheckoutProvider>
            </LiveProvider>
          </InboxProvider>
        </ListingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
