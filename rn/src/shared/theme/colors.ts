/** Tokens mirrored from front/src/style.css */

export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  mutedBg: string;
  accent: string;
  primary: string;
  primaryForeground: string;
  destructive: string;
  destructiveBg: string;
  youtube: string;
  soundcloud: string;
  success: string;
  warning: string;
  radius: number;
};

export const lightColors: ThemeColors = {
  background: '#f8f9ff',
  foreground: '#191a22',
  card: '#fdfdff',
  border: '#dfe1e9',
  muted: '#666875',
  mutedBg: '#eff0f8',
  accent: '#e9eeff',
  primary: '#4c4ee4',
  primaryForeground: '#fafbff',
  destructive: '#d40924',
  destructiveBg: '#fee2e2',
  youtube: '#ff0000',
  soundcloud: '#ff5500',
  success: '#16a34a',
  warning: '#d97706',
  radius: 10,
};

export const darkColors: ThemeColors = {
  background: '#090a0f',
  foreground: '#f1f1f6',
  card: '#12131a',
  border: 'rgba(255,255,255,0.10)',
  muted: '#9597a5',
  mutedBg: '#1e1f25',
  accent: '#202330',
  primary: '#8798ff',
  primaryForeground: '#0f111a',
  destructive: '#f14d4c',
  destructiveBg: 'rgba(241,77,76,0.15)',
  youtube: '#ff0000',
  soundcloud: '#ff5500',
  success: '#22c55e',
  warning: '#f59e0b',
  radius: 10,
};

/** @deprecated Prefer useTheme().colors — kept for gradual migration */
export const colors = lightColors;
