import { useKeyboardAwareScroll, type KeyboardAwareScrollApi } from '@/hooks/use-keyboard-aware-scroll';
import { useKeyboardDockPadding } from '@/hooks/use-keyboard-bottom-inset';
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
 * Place inside a transparent full-screen Modal — Android Modals do not
 * resize with the soft keyboard, so we pad explicitly from keyboard metrics.
 *
 * Uses window/keyboard overlap (same as KeyboardSafeDock) so adjustResize
 * devices are not double-padded.
 */
export function KeyboardSafeSheet({ children, onDismiss, style, gap = 12 }: SheetProps) {
  const { sheetBottom } = useScreenInsets();
  const padBottom = useKeyboardDockPadding(gap, sheetBottom);

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

type DockProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra gap above the keyboard when open. */
  gap?: number;
  /**
   * Pin to the bottom of the parent. Use on live overlays and other
   * absolute layouts where siblings would otherwise clip the composer.
   */
  absolute?: boolean;
};

/**
 * Bottom-docked composer / action bar that stays above the software keyboard.
 * Prefer this over hand-rolled `paddingBottom: keyboard.height` in screens.
 *
 * Uses window-frame vs keyboard `screenY` overlap so Android works whether the
 * activity resized (`adjustResize`) or stayed full-bleed (edge-to-edge / OEM).
 */
export function KeyboardSafeDock({ children, style, gap = 12, absolute = false }: DockProps) {
  const { sheetBottom } = useScreenInsets();
  const padBottom = useKeyboardDockPadding(gap, sheetBottom);

  return (
    <View style={[absolute ? styles.dockAbsolute : null, style, { paddingBottom: padBottom }]}>
      {children}
    </View>
  );
}

type ScreenProps = {
  /**
   * Form body. Pass a function to receive scroll anchors / focus helpers
   * (same API as `useKeyboardAwareScroll`).
   */
  children: ReactNode | ((api: KeyboardAwareScrollApi) => ReactNode);
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** When false, children are not wrapped in a ScrollView. */
  scroll?: boolean;
  keyboardVerticalOffset?: number;
};

/**
 * Full-screen form wrapper: KeyboardAvoidingView (iOS) + ScrollView with
 * overlap-based keyboard padding and focused-field scrolling (Android).
 */
export function KeyboardSafeScreen({
  children,
  style,
  contentContainerStyle,
  scroll = true,
  keyboardVerticalOffset = 0,
}: ScreenProps) {
  const keyboardScroll = useKeyboardAwareScroll();
  const body = typeof children === 'function' ? children(keyboardScroll) : children;
  const flatContent = StyleSheet.flatten(contentContainerStyle) as ViewStyle | undefined;
  const basePadBottom = typeof flatContent?.paddingBottom === 'number' ? flatContent.paddingBottom : 0;

  if (!scroll) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {body}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={keyboardScroll.scrollRef}
        onScroll={keyboardScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          { flexGrow: 1 },
          contentContainerStyle,
          { paddingBottom: basePadBottom + keyboardScroll.contentPaddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={keyboardScroll.automaticallyAdjustKeyboardInsets}
        showsVerticalScrollIndicator={false}
      >
        {body}
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
  dockAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
});
