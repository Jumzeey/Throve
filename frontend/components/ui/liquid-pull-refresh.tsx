import { Palette } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const PULL_THRESHOLD = 76;
const MAX_PULL = 130;
const HOLD_PULL = 54;

type RefreshTask = () => void | Promise<void>;

/** Shared pull-to-refresh state for list screens. */
export function usePullRefresh(task: RefreshTask) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await task();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, task]);

  return { refreshing, onRefresh };
}

type LiquidRefreshScrollViewProps = Omit<ScrollViewProps, 'onScroll' | 'refreshControl'> & {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  tintColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * System-wide pull-to-refresh ScrollView with a liquid plum droplet indicator.
 * Use instead of ScrollView + RefreshControl anywhere in the app.
 */
export function LiquidRefreshScrollView({
  refreshing,
  onRefresh,
  disabled = false,
  tintColor = Palette.plum,
  children,
  contentContainerStyle,
  style,
  scrollEventThrottle = 16,
  ...scrollProps
}: LiquidRefreshScrollViewProps) {
  const pull = useSharedValue(0);
  const isRefreshing = useSharedValue(false);
  const scrollY = useSharedValue(0);
  const pulse = useSharedValue(0);
  const crossed = useSharedValue(false);
  const disabledSV = useSharedValue(disabled);

  useEffect(() => {
    disabledSV.value = disabled;
  }, [disabled, disabledSV]);

  useEffect(() => {
    isRefreshing.value = refreshing;
    if (refreshing) {
      pull.value = withSpring(HOLD_PULL, { damping: 15, stiffness: 170, mass: 0.7 });
      pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 180 });
      pull.value = withSpring(0, { damping: 16, stiffness: 190, mass: 0.65 });
      crossed.value = false;
    }
  }, [refreshing, isRefreshing, pull, pulse, crossed]);

  const tickSelection = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const fireRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void onRefresh();
  }, [onRefresh]);

  const releasePull = useCallback(() => {
    if (pull.value >= PULL_THRESHOLD && !isRefreshing.value && !disabledSV.value) {
      fireRefresh();
      return;
    }
    if (!isRefreshing.value) {
      pull.value = withSpring(0, { damping: 16, stiffness: 200 });
      crossed.value = false;
    }
  }, [crossed, disabledSV, fireRefresh, isRefreshing, pull]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
      if (disabledSV.value || isRefreshing.value) return;
      // iOS rubber-band overscroll drives the liquid stretch
      if (Platform.OS === 'ios' && event.contentOffset.y < 0) {
        const next = Math.min(-event.contentOffset.y, MAX_PULL);
        pull.value = next;
        if (next >= PULL_THRESHOLD && !crossed.value) {
          crossed.value = true;
          runOnJS(tickSelection)();
        } else if (next < PULL_THRESHOLD * 0.85) {
          crossed.value = false;
        }
      }
    },
    onEndDrag: () => {
      'worklet';
      if (disabledSV.value || isRefreshing.value) return;
      if (Platform.OS === 'ios') {
        runOnJS(releasePull)();
      }
    },
    onMomentumEnd: () => {
      'worklet';
      if (
        Platform.OS === 'ios' &&
        !isRefreshing.value &&
        scrollY.value >= 0 &&
        pull.value > 0 &&
        pull.value < PULL_THRESHOLD
      ) {
        pull.value = withSpring(0, { damping: 16, stiffness: 200 });
        crossed.value = false;
      }
    },
  });

  // Android (and iOS fallback): pan from top when scroll is at rest
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetY(10)
    .failOffsetX([-28, 28])
    .onUpdate((event) => {
      'worklet';
      if (disabledSV.value || isRefreshing.value) return;
      if (scrollY.value > 2) return;
      // On iOS prefer rubber-band path when already overscrolling
      if (Platform.OS === 'ios' && event.translationY < 8) return;
      if (event.translationY <= 0) {
        if (!isRefreshing.value) pull.value = 0;
        return;
      }
      const next = Math.min(event.translationY * 0.5, MAX_PULL);
      pull.value = next;
      if (next >= PULL_THRESHOLD && !crossed.value) {
        crossed.value = true;
        runOnJS(tickSelection)();
      } else if (next < PULL_THRESHOLD * 0.85) {
        crossed.value = false;
      }
    })
    .onEnd(() => {
      'worklet';
      if (disabledSV.value || isRefreshing.value) return;
      if (scrollY.value > 2) return;
      runOnJS(releasePull)();
    });

  // Android needs a spacer so content yields; iOS already rubber-bands.
  const spacerStyle = useAnimatedStyle(() => ({
    height: Platform.OS === 'android' ? pull.value : 0,
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.indicatorLayer} pointerEvents="none">
        <LiquidDroplet pull={pull} pulse={pulse} color={tintColor} refreshing={isRefreshing} />
      </View>
      <GestureDetector gesture={pan}>
        <Animated.ScrollView
          {...scrollProps}
          style={style}
          contentContainerStyle={contentContainerStyle}
          onScroll={scrollHandler}
          scrollEventThrottle={scrollEventThrottle}
          bounces={!disabled}
          alwaysBounceVertical={!disabled}
          overScrollMode={disabled ? 'never' : 'always'}
          showsVerticalScrollIndicator={scrollProps.showsVerticalScrollIndicator ?? false}
        >
          <Animated.View style={spacerStyle} />
          {children}
        </Animated.ScrollView>
      </GestureDetector>
    </View>
  );
}

function LiquidDroplet({
  pull,
  pulse,
  color,
  refreshing,
}: {
  pull: SharedValue<number>;
  pulse: SharedValue<number>;
  color: string;
  refreshing: SharedValue<boolean>;
}) {
  const dropletStyle = useAnimatedStyle(() => {
    const stretch = Math.min(Math.max(pull.value / PULL_THRESHOLD, 0), 1.6);
    const width = interpolate(stretch, [0, 1, 1.45], [10, 48, 36], Extrapolation.CLAMP);
    const height = interpolate(stretch, [0, 1, 1.45], [10, 48, 62], Extrapolation.CLAMP);
    const radius = interpolate(stretch, [0, 1, 1.45], [5, 24, 18], Extrapolation.CLAMP);
    const opacity = interpolate(stretch, [0, 0.12, 0.35, 1], [0, 0.55, 1, 1], Extrapolation.CLAMP);
    const translateY = interpolate(pull.value, [0, PULL_THRESHOLD, MAX_PULL], [-8, 10, 18], Extrapolation.CLAMP);
    const scale = refreshing.value ? 0.92 + pulse.value * 0.12 : 1;
    const squishX = refreshing.value ? 1 + pulse.value * 0.08 : 1;
    const squishY = refreshing.value ? 1 - pulse.value * 0.06 : 1;

    return {
      width,
      height,
      borderRadius: radius,
      opacity,
      transform: [{ translateY }, { scaleX: scale * squishX }, { scaleY: scale * squishY }],
      backgroundColor: color,
    };
  });

  const shineStyle = useAnimatedStyle(() => {
    const p = Math.min(pull.value / PULL_THRESHOLD, 1);
    return {
      opacity: interpolate(p, [0, 0.4, 1], [0, 0.35, 0.55], Extrapolation.CLAMP),
    };
  });

  const satelliteStyle = useAnimatedStyle(() => {
    const p = pull.value / PULL_THRESHOLD;
    const show = interpolate(p, [0.55, 0.85, 1.2], [0, 1, 1], Extrapolation.CLAMP);
    const offsetY = interpolate(p, [0.55, 1.2], [18, 34], Extrapolation.CLAMP);
    const size = interpolate(p, [0.55, 1.2], [6, 11], Extrapolation.CLAMP);
    return {
      opacity: refreshing.value ? 0 : show,
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ translateY: offsetY }],
      backgroundColor: color,
    };
  });

  const trailStyle = useAnimatedStyle(() => {
    const p = pull.value / PULL_THRESHOLD;
    const h = interpolate(p, [0.7, 1.4], [0, 22], Extrapolation.CLAMP);
    const w = interpolate(p, [0.7, 1.4], [4, 8], Extrapolation.CLAMP);
    return {
      opacity: refreshing.value ? 0 : interpolate(p, [0.7, 1], [0, 0.55], Extrapolation.CLAMP),
      height: h,
      width: w,
      borderRadius: w / 2,
      backgroundColor: color,
      transform: [{ translateY: interpolate(p, [0.7, 1.4], [8, 20], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={styles.dropletWrap}>
      <Animated.View style={[styles.droplet, dropletStyle]}>
        <Animated.View style={[styles.shine, shineStyle]} />
      </Animated.View>
      <Animated.View style={[styles.trail, trailStyle]} />
      <Animated.View style={[styles.satellite, satelliteStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  indicatorLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    zIndex: 4,
    elevation: 4,
  },
  dropletWrap: {
    alignItems: 'center',
    paddingTop: 6,
  },
  droplet: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  shine: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    width: '28%',
    height: '28%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,247,240,0.55)',
  },
  trail: {
    position: 'absolute',
    top: 28,
  },
  satellite: {
    position: 'absolute',
    top: 28,
  },
});
