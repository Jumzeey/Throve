import { Palette, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { AlertCircleIcon, CheckIcon, InfoCircleIcon } from './icons';

export type ToastVariant = 'error' | 'success' | 'info' | 'warning';

export type ToastOptions = {
  variant: ToastVariant;
  title: string;
  message?: string | null;
  /** Milliseconds before auto-dismiss. */
  duration?: number;
};

type ActiveToast = ToastOptions & { id: number };

type ToastApi = {
  show: (options: ToastOptions) => void;
  error: (title: string, message?: string | null) => void;
  success: (title: string, message?: string | null) => void;
  info: (title: string, message?: string | null) => void;
  warning: (title: string, message?: string | null) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const VARIANTS: Record<
  ToastVariant,
  { badgeBg: string; Icon: typeof AlertCircleIcon; iconColor: string; duration: number; haptic: Haptics.NotificationFeedbackType | null }
> = {
  error: { badgeBg: Palette.errorBg, Icon: AlertCircleIcon, iconColor: Palette.error, duration: 5000, haptic: Haptics.NotificationFeedbackType.Error },
  warning: { badgeBg: Palette.warningBg, Icon: AlertCircleIcon, iconColor: Palette.warning, duration: 5000, haptic: Haptics.NotificationFeedbackType.Warning },
  success: { badgeBg: Palette.successBg, Icon: CheckIcon, iconColor: Palette.success, duration: 3500, haptic: Haptics.NotificationFeedbackType.Success },
  info: { badgeBg: Palette.ivory, Icon: InfoCircleIcon, iconColor: Palette.plum, duration: 3500, haptic: null },
};

const HIDDEN_Y = -140;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const nextId = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
  }, []);
  const hide = useCallback(() => setToast(null), []);
  const onDismissed = useCallback((id: number) => setToast((current) => (current?.id === id ? null : current)), []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      hide,
      error: (title, message) => show({ variant: 'error', title, message }),
      success: (title, message) => show({ variant: 'success', title, message }),
      info: (title, message) => show({ variant: 'info', title, message }),
      warning: (title, message) => show({ variant: 'warning', title, message }),
    }),
    [show, hide],
  );

  const view = toast ? <ToastView key={toast.id} toast={toast} onDismissed={onDismissed} /> : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {view && Platform.OS === 'ios' ? (
        // Renders above native modals and sheets, which a plain absolute View can't.
        <FullWindowOverlay>
          <GestureHandlerRootView style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {view}
          </GestureHandlerRootView>
        </FullWindowOverlay>
      ) : (
        view
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}

/**
 * Shows an error toast whenever `error` becomes non-empty, for screens that keep an error
 * string in state (e.g. to mark a field invalid). Clear it before each attempt so a repeat
 * of the same message toasts again.
 */
export function useErrorToast(error: string | null | undefined, title: string) {
  const toast = useToast();
  useEffect(() => {
    if (error) toast.error(title, error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
}

/** Success counterpart of useErrorToast for boolean/string "done" flags. */
export function useSuccessToast(active: unknown, title: string, message?: string) {
  const toast = useToast();
  useEffect(() => {
    if (active) toast.success(title, message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

function ToastView({ toast, onDismissed }: { toast: ActiveToast; onDismissed: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const cfg = VARIANTS[toast.variant];
  const translateY = useSharedValue(HIDDEN_Y);
  const opacity = useSharedValue(0);
  const closing = useRef(false);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    translateY.value = withTiming(HIDDEN_Y, { duration: 240 });
    opacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(onDismissed)(toast.id);
    });
  }, [onDismissed, opacity, toast.id, translateY]);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.8 });
    opacity.value = withTiming(1, { duration: 180 });
    if (cfg.haptic) void Haptics.notificationAsync(cfg.haptic).catch(() => {});
    AccessibilityInfo.announceForAccessibility(toast.message ? `${toast.title}. ${toast.message}` : toast.title);
    const timer = setTimeout(dismiss, toast.duration ?? cfg.duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY < 0 ? e.translationY : e.translationY * 0.15;
    })
    .onEnd((e) => {
      if (e.translationY < -20 || e.velocityY < -450) runOnJS(dismiss)();
      else translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });
  const tap = Gesture.Tap().onEnd(() => runOnJS(dismiss)());
  const gesture = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const { Icon } = cfg;
  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingTop: insets.top + 8 }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.toast, animatedStyle]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityHint="Tap or swipe up to dismiss"
        >
          <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
            <Icon size={15} color={cfg.iconColor} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title} numberOfLines={2}>
              {toast.title}
            </Text>
            {toast.message ? (
              <Text style={styles.message} numberOfLines={3}>
                {toast.message}
              </Text>
            ) : null}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 20,
    backgroundColor: Palette.plum,
    shadowColor: '#1B1113',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 12,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 13.5,
    lineHeight: 18,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  message: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.78)',
  },
});
