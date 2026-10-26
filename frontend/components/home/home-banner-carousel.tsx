import { AppImage } from '@/components/ui/app-image';
import { Palette, Radius, Typography } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openBrowserAsync } from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  targetType: 'category_browse' | 'department' | 'listing' | 'live' | 'seller' | 'search' | 'url';
  targetValue: string | null;
  imageUrl: string | null;
  theme: 'plum' | 'espresso' | 'gold' | 'sand';
};

const CACHE_KEY = 'throve.home_banners.v1';
const AUTO_ADVANCE_MS = 5000;
const SIDE_MARGIN = 20;

/** Shown when the admin has no live slides or the request fails, so Home never has a gap. */
const FALLBACK: HomeBanner = {
  id: 'fallback',
  title: 'Curated finds.\nLoved again.',
  subtitle: 'Timeless style, from closets across Nigeria.',
  ctaLabel: 'Shop now',
  targetType: 'category_browse',
  targetValue: null,
  imageUrl: null,
  theme: 'plum',
};

const THEMES: Record<HomeBanner['theme'], { bg: string; fg: string; ctaBg: string; ctaFg: string }> = {
  plum: { bg: Palette.plum, fg: Palette.ivory, ctaBg: Palette.ivory, ctaFg: Palette.plum },
  espresso: { bg: Palette.espresso, fg: Palette.ivory, ctaBg: Palette.ivory, ctaFg: Palette.espresso },
  gold: { bg: Palette.gold, fg: Palette.ivory, ctaBg: Palette.ivory, ctaFg: '#7A5420' },
  sand: { bg: Palette.sand, fg: Palette.espresso, ctaBg: Palette.plum, ctaFg: Palette.ivory },
};

type Props = {
  /** Bump to refetch (Home pull-to-refresh). */
  refreshSignal?: number;
};

export function HomeBannerCarousel({ refreshSignal = 0 }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const slideWidth = width - SIDE_MARGIN * 2;
  const [banners, setBanners] = useState<HomeBanner[]>([FALLBACK]);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<HomeBanner>>(null);
  const touching = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // Last good set first, so the carousel appears instantly; then the network.
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const cached = JSON.parse(raw) as HomeBanner[];
        if (Array.isArray(cached) && cached.length) setBanners(cached);
      })
      .catch(() => undefined);
    apiFetch<HomeBanner[]>('/home/banners')
      .then((live) => {
        if (cancelled || !Array.isArray(live)) return;
        setBanners(live.length ? live : [FALLBACK]);
        setIndex(0);
        void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(live)).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      if (touching.current) return;
      setIndex((current) => {
        const next = (current + 1) % banners.length;
        listRef.current?.scrollToOffset({ offset: next * slideWidth, animated: true });
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [banners.length, slideWidth]);

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      touching.current = false;
      setIndex(Math.round(event.nativeEvent.contentOffset.x / slideWidth));
    },
    [slideWidth],
  );

  const open = useCallback(
    (banner: HomeBanner) => {
      const value = banner.targetValue ?? '';
      switch (banner.targetType) {
        case 'department':
          router.push({ pathname: '/category-browse', params: { department: value } });
          return;
        case 'listing':
          router.push({ pathname: '/product/[id]', params: { id: value } });
          return;
        case 'live':
          router.push({ pathname: '/live/[id]', params: { id: value } });
          return;
        case 'seller':
          router.push({ pathname: '/seller/[username]', params: { username: value.replace(/^@/, '') } });
          return;
        case 'search':
          router.push({ pathname: '/search', params: { q: value } });
          return;
        case 'url':
          if (/^https:\/\//i.test(value)) void openBrowserAsync(value).catch(() => undefined);
          return;
        default:
          router.push('/category-browse');
      }
    },
    [router],
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        style={{ width: slideWidth, alignSelf: 'center' }}
        getItemLayout={(_, i) => ({ length: slideWidth, offset: slideWidth * i, index: i })}
        onScrollBeginDrag={() => {
          touching.current = true;
        }}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => <Slide banner={item} width={slideWidth} onPress={() => open(item)} />}
      />
      {banners.length > 1 ? (
        <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`Banner ${index + 1} of ${banners.length}`}>
          {banners.map((item, i) => (
            <View key={item.id} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Slide({ banner, width, onPress }: { banner: HomeBanner; width: number; onPress: () => void }) {
  const theme = THEMES[banner.theme] ?? THEMES.plum;
  const onImage = Boolean(banner.imageUrl);
  const fg = onImage ? Palette.ivory : theme.fg;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.slide, { width, backgroundColor: theme.bg }]}
      accessibilityRole="button"
      accessibilityLabel={banner.ctaLabel ? `${banner.title.replace('\n', ' ')}. ${banner.ctaLabel}` : banner.title}
    >
      {onImage ? (
        <>
          <AppImage source={banner.imageUrl} style={StyleSheet.absoluteFill} />
          <View style={styles.scrim} />
        </>
      ) : null}
      <Text style={[styles.title, { color: fg }]} maxFontSizeMultiplier={1.15} allowFontScaling>
        {banner.title}
      </Text>
      {banner.subtitle ? (
        <Text style={[styles.sub, { color: fg }]} maxFontSizeMultiplier={1.15}>
          {banner.subtitle}
        </Text>
      ) : null}
      {banner.ctaLabel ? (
        <View style={[styles.cta, { backgroundColor: theme.ctaBg }]}>
          <Text style={[styles.ctaText, { color: theme.ctaFg }]} maxFontSizeMultiplier={1.1}>
            {banner.ctaLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 26 },
  slide: {
    minHeight: 210,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    justifyContent: 'center',
    gap: 12,
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(27,17,19,0.38)' },
  title: {
    fontFamily: Typography.display,
    fontSize: 29,
    lineHeight: 34,
    maxWidth: 220,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  sub: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    opacity: 0.85,
    maxWidth: 200,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
  },
  ctaText: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.border },
  dotOn: { width: 18, backgroundColor: Palette.plum },
});
