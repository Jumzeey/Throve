import { useContext } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/** Visual height of tab icons + labels (excluding system bottom inset). */
export const TAB_BAR_CONTENT_HEIGHT = 56;

/**
 * Height of Android 3-button navigation. Edge-to-edge often reports
 * insets.bottom as 0, which lets scaffolds overlap the system controls.
 */
export const ANDROID_NAV_MIN = 48;

const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Normalised safe-area helpers for tab stacks, sheets, and full-screen flows.
 */
export function useScreenInsets() {
  const insets = useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;
  const bottom = Platform.OS === 'android' ? Math.max(insets.bottom, ANDROID_NAV_MIN) : insets.bottom;
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + bottom;

  return {
    top: insets.top,
    bottom,
    /** Bottom sheets and sticky action bars — nav inset plus a little breathing room. */
    sheetBottom: bottom + 12,
    /** Scroll padding so last items sit above the tab bar. */
    tabScrollBottom: tabBarHeight + 16,
    tabBarHeight,
  };
}
