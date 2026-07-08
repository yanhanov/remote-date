import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/shared/theme/colors';

export function createCommonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screenContent: {
      flex: 1,
      padding: 20,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.muted,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.4,
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 15,
      color: colors.muted,
      marginTop: 4,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 13,
      marginTop: 8,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.muted,
      marginBottom: 8,
      marginTop: 16,
      paddingHorizontal: 4,
    },
  });
}

/** @deprecated Prefer createCommonStyles(useTheme().colors) */
export const commonStyles = createCommonStyles(
  require('./colors').lightColors,
);
