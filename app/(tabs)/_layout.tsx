import { HapticTab } from '@/components/haptic-tab';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { SplashScreen } from '@/components/ui/splash-screen';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

function TabDot({ focused }: { focused: boolean }) {
  return <View style={[styles.dot, focused ? styles.dotOn : styles.dotOff]} />;
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
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Sell',
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
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
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  dotOn: {
    backgroundColor: Palette.text,
  },
  dotOff: {
    backgroundColor: 'transparent',
  },
});
