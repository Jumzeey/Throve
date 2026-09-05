import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

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
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setInset({
        height: event.endCoordinates.height,
        screenY: event.endCoordinates.screenY,
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setInset({ height: 0, screenY: 0 });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return inset;
}

export function useKeyboardBottomInset() {
  return useKeyboardInset().height;
}
