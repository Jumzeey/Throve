import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const FIELD_GAP = 16;

/**
 * Pads a ScrollView and scrolls the focused field above the keyboard.
 * Needed on Android edge-to-edge, where window resize / KeyboardAvoidingView
 * often leave lower fields (e.g. confirm password) covered.
 */
export function useKeyboardAwareScroll() {
  const { bottom } = useScreenInsets();
  const keyboard = useKeyboardInset();
  const keyboardRef = useRef(keyboard);
  keyboardRef.current = keyboard;

  const scrollRef = useRef<ScrollView>(null);
  const focusedNode = useRef<View | null>(null);
  const scrollY = useRef(0);
  const anchors = useRef<Record<string, View | null>>({});

  const ensureFocusedVisible = useCallback(() => {
    const node = focusedNode.current;
    const { height: kb, screenY } = keyboardRef.current;
    if (!node || kb <= 0) return;

    node.measureInWindow((_x, y, _w, height) => {
      const keyboardTop = screenY > 0 ? screenY : Dimensions.get('window').height - kb;
      const overlap = y + height + FIELD_GAP - keyboardTop;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollY.current + overlap),
          animated: true,
        });
      }
    });
  }, []);

  useEffect(() => {
    if (keyboard.height <= 0) return;
    const timer = setTimeout(ensureFocusedVisible, 60);
    return () => clearTimeout(timer);
  }, [keyboard.height, keyboard.screenY, ensureFocusedVisible]);

  const setAnchor = useCallback((key: string) => {
    return (node: View | null) => {
      anchors.current[key] = node;
    };
  }, []);

  const onFieldFocus = useCallback(
    (key: string) => {
      focusedNode.current = anchors.current[key] ?? null;
      setTimeout(ensureFocusedVisible, 50);
      setTimeout(ensureFocusedVisible, 280);
    },
    [ensureFocusedVisible],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  const contentPaddingBottom =
    Platform.OS === 'android'
      ? (keyboard.height > 0 ? keyboard.height + 24 : bottom + 24)
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
