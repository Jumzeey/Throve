import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import type { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type SheetProps = {
  children: ReactNode;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Extra gap above the keyboard when open. */
  gap?: number;
};

/**
 * Bottom sheet that lifts above the software keyboard (iOS + Android).
 * Place inside a transparent full-screen Modal.
 */
export function KeyboardSafeSheet({ children, onDismiss, style, gap = 10 }: SheetProps) {
  const { sheetBottom } = useScreenInsets();
  const { height: keyboardHeight } = useKeyboardInset();
  const padBottom = keyboardHeight > 0 ? keyboardHeight + gap : sheetBottom;

  return (
    <View style={styles.sheetRoot}>
      {onDismiss ? (
        <Pressable
          style={styles.flex}
          onPress={() => {
            Keyboard.dismiss();
            onDismiss();
          }}
        />
      ) : (
        <View style={styles.flex} />
      )}
      <View style={[styles.sheet, { paddingBottom: padBottom }, style]}>{children}</View>
    </View>
  );
}

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** When false, children are not wrapped in a ScrollView. */
  scroll?: boolean;
  keyboardVerticalOffset?: number;
};

/**
 * Full-screen form wrapper: KeyboardAvoidingView + ScrollView with keyboard insets.
 */
export function KeyboardSafeScreen({
  children,
  style,
  contentContainerStyle,
  scroll = true,
  keyboardVerticalOffset = 0,
}: ScreenProps) {
  const { bottom } = useScreenInsets();
  const { height: keyboardHeight } = useKeyboardInset();
  const extraPad = Platform.OS === 'android' && keyboardHeight > 0 ? keyboardHeight + 24 : Math.max(bottom + 24, 40);

  if (!scroll) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      <ScrollView
        contentContainerStyle={[{ flexGrow: 1, paddingBottom: extraPad }, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
  },
});
