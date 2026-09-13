import { useKeyboardInset, keyboardWindowOverlap } from '@/hooks/use-keyboard-bottom-inset';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

const FIELD_GAP = 16;
const MULTILINE_FIELD_GAP = 88;

export type KeyboardAwareScrollApi = {
  scrollRef: React.RefObject<ScrollView | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  setAnchor: (key: string) => (node: View | null) => void;
  onFieldFocus: (key: string, options?: { multiline?: boolean }) => void;
  contentPaddingBottom: number;
  automaticallyAdjustKeyboardInsets: boolean;
};

/**
 * How much of the keyboard covers the display. Uses the larger of:
 * - window-frame overlap (correct when adjustResize shrinks the app window)
 * - screenY vs physical screen (correct when OEM/edge-to-edge leaves a full-bleed window)
 */
function keyboardLiftPx(inset: { height: number; screenY: number }, windowBottomY: number) {
  if (inset.height <= 0) return 0;
  const windowOverlap = keyboardWindowOverlap(inset, windowBottomY);
  const screen = Dimensions.get('screen');
  const screenOverlap =
    inset.screenY > 0 ? Math.max(0, screen.height - inset.screenY) : inset.height;
  // Never under-lift on full-bleed OEMs; never invent more than the keyboard itself.
  return Math.min(inset.height, Math.max(windowOverlap, screenOverlap));
}

/**
 * Pads a ScrollView and scrolls the focused field above the keyboard.
 * Needed on Android edge-to-edge, where window resize / KeyboardAvoidingView
 * often leave lower fields (e.g. confirm password) covered.
 */
export function useKeyboardAwareScroll(): KeyboardAwareScrollApi {
  const { bottom } = useScreenInsets();
  const frame = useSafeAreaFrame();
  const keyboard = useKeyboardInset();
  const keyboardRef = useRef(keyboard);
  keyboardRef.current = keyboard;
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const scrollRef = useRef<ScrollView>(null);
  const focusedNode = useRef<View | null>(null);
  const focusedGap = useRef(FIELD_GAP);
  const scrollY = useRef(0);
  const anchors = useRef<Record<string, View | null>>({});
  const [multilineFocused, setMultilineFocused] = useState(false);

  const ensureFocusedVisible = useCallback(() => {
    const node = focusedNode.current;
    const { height: kb, screenY } = keyboardRef.current;
    if (!node || kb <= 0) return;
    const frameNow = frameRef.current;

    node.measureInWindow((_x, y, _w, height) => {
      const windowBottom = frameNow.y + frameNow.height;
      const lift = keyboardLiftPx({ height: kb, screenY }, windowBottom);
      // Prefer the true keyboard top on screen; fall back to window-relative estimate.
      const keyboardTop =
        screenY > 0 ? screenY : Math.max(windowBottom - lift, Dimensions.get('window').height - lift);
      const overlap = y + height + focusedGap.current - keyboardTop;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollY.current + overlap),
          animated: true,
        });
      }
    });
  }, []);

  useEffect(() => {
    if (keyboard.height <= 0) {
      setMultilineFocused(false);
      return;
    }
    const timers = [60, 180, 320].map((ms) => setTimeout(ensureFocusedVisible, ms));
    return () => timers.forEach(clearTimeout);
  }, [keyboard.height, keyboard.screenY, ensureFocusedVisible]);

  const setAnchor = useCallback((key: string) => {
    return (node: View | null) => {
      anchors.current[key] = node;
    };
  }, []);

  const onFieldFocus = useCallback(
    (key: string, options?: { multiline?: boolean }) => {
      focusedNode.current = anchors.current[key] ?? null;
      const multiline = Boolean(options?.multiline);
      focusedGap.current = multiline ? MULTILINE_FIELD_GAP : FIELD_GAP;
      setMultilineFocused(multiline);
      setTimeout(ensureFocusedVisible, 50);
      setTimeout(ensureFocusedVisible, 280);
      if (multiline) {
        setTimeout(ensureFocusedVisible, 450);
      }
    },
    [ensureFocusedVisible],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  const lift =
    keyboard.height > 0 ? keyboardLiftPx(keyboard, frame.y + frame.height) : 0;
  const contentPaddingBottom =
    Platform.OS === 'android'
      ? keyboard.height > 0
        ? lift + 24 + (multilineFocused ? 48 : 0)
        : bottom + 24
      : Math.max(bottom, 30);

  return {
    scrollRef,
    onScroll,
    setAnchor,
    onFieldFocus,
    contentPaddingBottom,
    automaticallyAdjustKeyboardInsets: Platform.OS === 'ios',
  };
}
