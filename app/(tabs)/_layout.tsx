import { HapticTab } from '@/components/haptic-tab';
import { SplashScreen } from '@/components/ui/splash-screen';
import { HomeIcon, InboxIcon, LiveIcon, ProfileIcon, SellIcon } from '@/components/ui/tab-icons';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  const { isReady, session } = useAuth();

  if (!isReady) {
    return <SplashScreen />;
  }
  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!session.setupComplete) {
    return <Redirect href="/(auth)/setup" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Palette.accent700,
        tabBarInactiveTintColor: Palette.muted3,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
      }}>
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
  bar: {
    borderTopColor: Palette.divider,
    borderTopWidth: 1,
    backgroundColor: Palette.background,
  },
  label: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
  },
});
