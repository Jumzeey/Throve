import { HapticTab } from '@/components/haptic-tab';
import { SplashScreen } from '@/components/ui/splash-screen';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ focused, color, outline, filled }: { focused: boolean; color: string; outline: IconName; filled: IconName }) {
  return <Ionicons name={focused ? filled : outline} size={22} color={color} />;
}

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
        tabBarActiveTintColor: Palette.text,
        tabBarInactiveTintColor: Palette.muted3,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} outline="home-outline" filled="home" />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} outline="videocam-outline" filled="videocam" />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Sell',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} outline="add-circle-outline" filled="add-circle" />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} outline="chatbubble-ellipses-outline" filled="chatbubble-ellipses" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} outline="person-outline" filled="person" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopColor: Palette.borderSoft,
    borderTopWidth: 1,
    backgroundColor: Palette.background,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
