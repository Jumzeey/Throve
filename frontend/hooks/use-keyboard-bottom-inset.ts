import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Bottom inset matching the visible keyboard — reliable on Android edge-to-edge
 * where window resize / KeyboardAvoidingView often fails.
 */
export function useKeyboardBottomInset() {
  const [bottom, setBottom] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setBottom(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setBottom(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return bottom;
}
