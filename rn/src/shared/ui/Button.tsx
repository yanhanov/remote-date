import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useMemo, type ReactNode } from 'react';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = 'default',
  loading,
  disabled,
  icon,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'outline' || variant === 'ghost'
              ? colors.foreground
              : colors.primaryForeground
          }
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, styles[`text_${variant}` as const]]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pressed: {
      opacity: 0.9,
    },
    disabled: {
      opacity: 0.6,
    },
    text: {
      fontSize: 15,
      fontWeight: '600',
    },
    default: {
      backgroundColor: colors.primary,
    },
    outline: {
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    destructive: {
      backgroundColor: colors.destructive,
    },
    text_default: {
      color: colors.primaryForeground,
    },
    text_outline: {
      color: colors.foreground,
    },
    text_ghost: {
      color: colors.foreground,
    },
    text_destructive: {
      color: '#ffffff',
    },
  });
}
