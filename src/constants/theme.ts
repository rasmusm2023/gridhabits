export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  emptyCell: string;
  accent: string;
  accentDim: string;
  onAccent: string;
  danger: string;
  todayRing: string;
};

export const DarkColors: ThemeColors = {
  background: '#0d1117',
  surface: '#161b22',
  surfaceHover: '#1c2128',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  emptyCell: '#21262d',
  accent: '#4ade80',
  accentDim: '#166534',
  onAccent: '#0d1117',
  danger: '#fb7185',
  todayRing: '#e6edf3',
};

export const LightColors: ThemeColors = {
  background: '#f6f8fa',
  surface: '#ffffff',
  surfaceHover: '#f3f4f6',
  border: '#d0d7de',
  text: '#1f2328',
  textMuted: '#656d76',
  emptyCell: '#ebedf0',
  accent: '#16a34a',
  accentDim: '#dcfce7',
  onAccent: '#ffffff',
  danger: '#e11d48',
  todayRing: '#1f2328',
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
