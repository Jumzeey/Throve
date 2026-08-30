/** Premium Editorial design tokens — Throve Hi-Fi Master */
export const Palette = {
  // Core surfaces
  ivory: '#FFF7F0',
  ivoryElevated: '#FFFCF8',
  sand: '#F3EDE6',
  espresso: '#2B211F',
  body: '#5C4B45',
  muted: '#7A6A64',
  muted2: '#8C7A73',
  muted3: '#A2938B',
  label: '#8C7A73',

  // Brand
  plum: '#5A1F45',
  blush: '#D88AA1',
  gold: '#B68235',

  // Semantic
  success: '#4F6B4C',
  successText: '#3F5A3C',
  successBg: '#F4F7F2',
  successBorder: '#B9CDB4',
  warning: '#B4762A',
  warningText: '#8F5D1F',
  warningBg: '#FBF3E7',
  warningBorder: '#E7D6BE',
  error: '#9E2B2B',
  errorText: '#9E2B2B',
  errorBody: '#7A5150',
  errorBg: '#FBF0EF',
  errorBorder: '#E2B4B4',

  // Borders & dividers
  border: '#E2D7CC',
  borderSoft: '#DCCFC4',
  divider: '#EDE3D9',
  skeleton: '#EDE5DC',
  placeholder: '#BBACA2',

  // Live dark theme
  liveRed: '#C0392B',
  liveDark: '#1B1113',
  liveDarkAlt: '#241A1C',
  liveOverlay: 'rgba(27,17,19,0.55)',

  // Disabled
  disabled: '#B3A49C',
  disabledBg: '#F1E9E1',
  disabledBorder: '#E2D7CC',

  // Focus
  focusRing: 'rgba(90,31,69,0.09)',

  // Legacy aliases (map old token names → Premium Editorial)
  text: '#2B211F',
  background: '#FFF7F0',
  page: '#FFF7F0',
  surface: '#FFFCF8',
  hatch: '#F3EDE6',
  hatchAlt: '#EDE5DC',
  accent: '#5A1F45',
  accent100: '#FFFCF8',
  accent200: '#E7DCD2',
  accent300: '#C9A9BD',
  accent400: '#8C5A75',
  accent500: '#5A1F45',
  accent600: '#5A1F45',
  accent700: '#5A1F45',
  accent800: '#2B211F',
  live: '#C0392B',
  chipBg: '#FFFCF8',
  neutral300: '#E2D7CC',
  neutral500: '#7A6A64',
  neutral700: '#2B211F',
  neutral900: '#1B1113',
} as const;

export const Typography = {
  display: 'PlayfairDisplay_600SemiBold',
  displayBold: 'PlayfairDisplay_700Bold',
  displayRegular: 'PlayfairDisplay_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  /** @deprecated use display */
  heading: 'PlayfairDisplay_600SemiBold',
  /** @deprecated use displayBold */
  headingBold: 'PlayfairDisplay_700Bold',
  bodyItalic: 'Inter_400Regular',
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
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 22,
  button: 26,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#2B211F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#2B211F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2B211F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    elevation: 8,
  },
  liveCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 26,
    elevation: 12,
  },
} as const;

export const Colors = {
  light: {
    text: Palette.espresso,
    background: Palette.ivory,
    tint: Palette.plum,
    icon: Palette.muted,
    tabIconDefault: Palette.muted,
    tabIconSelected: Palette.plum,
  },
  dark: {
    text: Palette.ivory,
    background: Palette.liveDark,
    tint: Palette.ivory,
    icon: 'rgba(255,247,240,0.7)',
    tabIconDefault: 'rgba(255,247,240,0.6)',
    tabIconSelected: Palette.ivory,
  },
};
