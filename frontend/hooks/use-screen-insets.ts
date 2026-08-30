import { useContext } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/** Visual height of tab icons + labels (excluding system bottom inset). */
export const TAB_BAR_CONTENT_HEIGHT = 56;

const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Normalised safe-area helpers for tab stacks and full-screen flows.
 * Android edge-to-edge often needs a minimum bottom inset when the OS reports 0.
 */
export function useScreenInsets() {
  const insets = useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;
  const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + bottom;

  return {
    top: insets.top,
    bottom,
    /** Scroll padding so last items sit above the tab bar (includes system nav inset on Android). */
    tabScrollBottom: tabBarHeight + 16,
    tabBarHeight,
  };
}
