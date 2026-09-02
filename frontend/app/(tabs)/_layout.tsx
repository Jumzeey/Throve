import { HapticTab } from '@/components/haptic-tab';
import { SplashScreen } from '@/components/ui/splash-screen';
import { HomeIcon, InboxIcon, LiveIcon, ProfileIcon, SellIcon } from '@/components/ui/tab-icons';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { isReady, isAuthenticatingLink, session } = useAuth();
  const { bottom, tabBarHeight } = useScreenInsets();

  const tabBarStyle = useMemo(
    () => ({
      borderTopColor: Palette.border,
      borderTopWidth: 1,
      backgroundColor: Palette.ivoryElevated,
      paddingTop: 8,
      paddingBottom: bottom,
      height: tabBarHeight,
      ...(Platform.OS === 'android' ? { elevation: 8 } : {}),
    }),
    [bottom, tabBarHeight],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarActiveTintColor: Palette.plum,
      tabBarInactiveTintColor: Palette.muted,
      tabBarLabelStyle: styles.label,
      tabBarStyle,
      // Keep tab content above the bar; we apply bottom inset on the bar itself.
      safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
      tabBarHideOnKeyboard: Platform.OS === 'android',
    }),
    [tabBarStyle],
  );

  if (!isReady || isAuthenticatingLink) {
    return <SplashScreen />;
  }
  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!session.setupComplete) {
    return <Redirect href="/(auth)/setup" />;
  }

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => <LiveIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Sell',
          tabBarIcon: ({ color }) => <SellIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => <InboxIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontFamily: Typography.bodySemiBold,
    marginBottom: Platform.OS === 'android' ? 2 : 0,
  },
});
