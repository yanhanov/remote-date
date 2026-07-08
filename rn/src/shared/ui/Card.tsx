import { View, Text, StyleSheet, type ViewProps } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface CardProps extends ViewProps {
  title?: string;
  description?: string;
}

export function Card({ title, description, children, style, ...props }: CardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, style]} {...props}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      width: '100%',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 16,
      lineHeight: 20,
    },
  });
}
