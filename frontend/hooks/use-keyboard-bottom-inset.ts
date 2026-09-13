import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

export type KeyboardInset = {
  height: number;
  screenY: number;
};

/**
 * Keyboard metrics — reliable on Android edge-to-edge
 * where window resize / KeyboardAvoidingView often fails.
 */
export function useKeyboardInset(): KeyboardInset {
  const [inset, setInset] = useState<KeyboardInset>({ height: 0, screenY: 0 });

  useEffect(() => {
    const apply = (height: number, screenY: number) => {
      setInset({
        height: Math.max(0, height),
        screenY: Math.max(0, screenY),
      });
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const changeEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';

    const onShowOrChange = (event: { endCoordinates: { height: number; screenY: number } }) => {
      apply(event.endCoordinates.height, event.endCoordinates.screenY);
    };

    const showSub = Keyboard.addListener(showEvent, onShowOrChange);
    const changeSub = Keyboard.addListener(changeEvent, onShowOrChange);
    const hideSub = Keyboard.addListener(hideEvent, () => {
      apply(0, 0);
    });

    return () => {
      showSub.remove();
      changeSub.remove();
      hideSub.remove();
    };
  }, []);

  return inset;
}

export function useKeyboardBottomInset() {
  return useKeyboardInset().height;
}

/**
 * How many pixels of the software keyboard overlap the app window.
 * Works whether Android `adjustResize` shrank the window or left it full-bleed
 * (common with edge-to-edge / OEM skins). Prefer this over raw `keyboard.height`.
 */
export function keyboardWindowOverlap(inset: KeyboardInset, windowBottomY: number): number {
  if (inset.height <= 0) return 0;
  if (inset.screenY > 0) return Math.max(0, windowBottomY - inset.screenY);
  return inset.height;
}

/** Bottom padding so a dock / composer clears the keyboard on every device. */
export function useKeyboardDockPadding(gap = 12, restingBottom?: number): number {
  const frame = useSafeAreaFrame();
  const inset = useKeyboardInset();
  if (inset.height <= 0) return restingBottom ?? 0;
  const overlap = keyboardWindowOverlap(inset, frame.y + frame.height);
  // Even when adjustResize already cleared the keyboard (overlap ≈ 0), keep a small gap.
  return Math.max(overlap, 0) + gap;
}
