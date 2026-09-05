import { Palette } from '@/constants/theme';
import { Stack } from 'expo-router';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function LiveStackLayout() {
  useEffect(() => {
    setStatusBarStyle('light');
    if (Platform.OS === 'android') {
      void SystemUI.setBackgroundColorAsync(Palette.liveDark);
    }
    return () => {
      setStatusBarStyle('dark');
      if (Platform.OS === 'android') {
        void SystemUI.setBackgroundColorAsync(Palette.ivory);
      }
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </>
  );
}
