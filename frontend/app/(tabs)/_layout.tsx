import { HapticTab } from '@/components/haptic-tab';
import { SplashScreen } from '@/components/ui/splash-screen';
import { HomeIcon, InboxIcon, LiveIcon, ProfileIcon, SellIcon } from '@/components/ui/tab-icons';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

function TabBarLabel({ color, children }: { color: string; children: string }) {
  return (
    <View style={styles.labelWrap}>
      <Text
        style={[styles.label, { color }]}
        numberOfLines={1}
        allowFontScaling={false}
        android_hyphenationFrequency="none"
      >
        {children}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { isReady, isAuthenticatingLink, session } = useAuth();
  const { bottom, tabBarHeight } = useScreenInsets();

  const tabBarStyle = useMemo(
    () => ({
      borderTopColor: Palette.border,
      borderTopWidth: 1,
      backgroundColor: Palette.ivoryElevated,
      paddingTop: 6,
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
      // Force stacked labels — landscape / mis-reported frame size was
      // putting labels beside icons and clipping them to "Ho…", "Li…", etc.
      tabBarLabelPosition: 'below-icon' as const,
      tabBarAllowFontScaling: false,
      tabBarItemStyle: styles.item,
      tabBarIconStyle: styles.icon,
      tabBarLabel: ({ color, children }: { color: string; children: string }) => (
        <TabBarLabel color={color}>{children}</TabBarLabel>
      ),
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
  item: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginTop: 2,
  },
  labelWrap: {
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: 1,
    marginTop: 2,
  },
  label: {
    width: '100%',
    fontSize: 10,
    lineHeight: 12,
    fontFamily: Typography.bodySemiBold,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
