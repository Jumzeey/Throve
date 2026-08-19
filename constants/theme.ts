export const Palette = {
  // Core text
  text: '#1a1a1a',
  muted: '#57534d',
  muted2: '#77746e',
  muted3: '#9c9892',

  // Surfaces
  background: '#fff',
  page: '#f7f6f4',
  surface: '#faf9f7',
  divider: '#e8e5df',

  // Borders
  border: '#d8d5cf',
  borderSoft: '#ece9e4',

  // Legacy hatch (kept for transition; prefer AppImage)
  hatch: '#f4f3f1',
  hatchAlt: '#ece9e4',

  // Accent (warm-gold range)
  accent: '#a07850',
  accent100: '#f5f0ea',
  accent200: '#e6d9c8',
  accent300: '#d4c0a6',
  accent400: '#c2a784',
  accent500: '#a07850',
  accent600: '#8c673f',
  accent700: '#76552f',
  accent800: '#5c4222',

  // Live / coral
  live: '#c6472b',

  // Error
  errorBg: '#fbeaea',
  errorBorder: '#e3b8b8',
  errorText: '#8a2e2e',

  // Chips / tags
  chipBg: '#f1f0ee',

  // Neutral scale
  neutral300: '#d4d4d4',
  neutral500: '#737373',
  neutral700: '#404040',
  neutral900: '#171717',
} as const;

export const Typography = {
  heading: 'CormorantGaramond_600SemiBold',
  headingBold: 'CormorantGaramond_700Bold',
  body: 'Lora_400Regular',
  bodyItalic: 'Lora_400Regular_Italic',
  bodyMedium: 'Lora_500Medium',
  bodySemiBold: 'Lora_600SemiBold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const Colors = {
  light: {
    text: Palette.text,
    background: Palette.background,
    tint: Palette.accent700,
    icon: Palette.muted2,
    tabIconDefault: Palette.muted3,
    tabIconSelected: Palette.accent700,
  },
  dark: {
    text: Palette.text,
    background: Palette.background,
    tint: Palette.accent700,
    icon: Palette.muted2,
    tabIconDefault: Palette.muted3,
    tabIconSelected: Palette.accent700,
  },
};
