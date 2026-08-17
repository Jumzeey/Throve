export const Palette = {
  text: '#1a1a1a',
  muted: '#57534d',
  muted2: '#77746e',
  muted3: '#9c9892',
  background: '#fff',
  page: '#f7f6f4',
  border: '#d8d5cf',
  borderSoft: '#ece9e4',
  hatch: '#f4f3f1',
  hatchAlt: '#ece9e4',
  errorBg: '#fbeaea',
  errorBorder: '#e3b8b8',
  errorText: '#8a2e2e',
  live: '#8a2e2e',
  chipBg: '#f1f0ee',
} as const;

export const Colors = {
  light: {
    text: Palette.text,
    background: Palette.background,
    tint: Palette.text,
    icon: Palette.muted2,
    tabIconDefault: Palette.muted3,
    tabIconSelected: Palette.text,
  },
  dark: {
    text: Palette.text,
    background: Palette.background,
    tint: Palette.text,
    icon: Palette.muted2,
    tabIconDefault: Palette.muted3,
    tabIconSelected: Palette.text,
  },
};
