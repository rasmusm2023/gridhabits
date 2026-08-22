export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  /** Stronger secondary text (habit meta / occurrence). */
  textSecondary: string;
  emptyCell: string;
  /** Brand / petrol — primary actions, chrome. */
  accent: string;
  accentDim: string;
  onAccent: string;
  /** Habit completion green — fills, checks, heatmap. */
  success: string;
  successRgb: string;
  onSuccess: string;
  /** Habit title when sitting on a success-tinted card. */
  textOnSuccess: string;
  metaOnSuccess: string;
  danger: string;
  todayRing: string;
};

/** Petrol / blue-green-grey brand. */
const BRAND_DARK = '#4f7c78';
const BRAND_LIGHT = '#3f6f6b';

/** Completion green (separate from brand). */
const SUCCESS_DARK = '#3d9b6a';
const SUCCESS_LIGHT = '#2f8f5b';

export const DarkColors: ThemeColors = {
  background: '#0d1117',
  surface: '#161b22',
  surfaceHover: '#1c2128',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  textSecondary: '#b6c2cc',
  emptyCell: '#21262d',
  accent: BRAND_DARK,
  accentDim: '#243f3d',
  onAccent: '#f4faf9',
  success: SUCCESS_DARK,
  successRgb: '61, 155, 106',
  onSuccess: '#f0fdf4',
  textOnSuccess: '#ecfdf5',
  metaOnSuccess: 'rgba(236, 253, 245, 0.82)',
  danger: '#fb7185',
  todayRing: '#e6edf3',
};

export const LightColors: ThemeColors = {
  background: '#f4f6f5',
  surface: '#ffffff',
  surfaceHover: '#eef2f1',
  border: '#c9d4d1',
  text: '#1a2422',
  textMuted: '#5c6b68',
  textSecondary: '#3d4f4c',
  emptyCell: '#e4ebe9',
  accent: BRAND_LIGHT,
  accentDim: '#d7e6e4',
  onAccent: '#ffffff',
  success: SUCCESS_LIGHT,
  successRgb: '47, 143, 91',
  onSuccess: '#ffffff',
  textOnSuccess: '#143528',
  metaOnSuccess: 'rgba(20, 53, 40, 0.72)',
  danger: '#e11d48',
  todayRing: '#1a2422',
};

export const Themes: Record<ColorScheme, ThemeColors> = {
  dark: DarkColors,
  light: LightColors,
};

/** Default palette (dark). Prefer `useTheme().colors` so light mode updates correctly. */
export const Colors = DarkColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export function isColorScheme(value: unknown): value is ColorScheme {
  return value === 'light' || value === 'dark';
}
