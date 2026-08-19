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
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';

const ThroveTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
    card: '#ffffff',
    text: Palette.text,
    border: Palette.borderSoft,
    primary: Palette.accent700,
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
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_600SemiBold,
  });

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return (
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
  );
}
