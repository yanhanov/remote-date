import {
  TextInput,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { forwardRef, useMemo } from 'react';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface InputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(
  function Input({ style, containerStyle, ...props }, ref) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
      <TextInput
        ref={ref}
        style={[styles.input, containerStyle, style]}
        placeholderTextColor={colors.muted}
        {...props}
      />
    );
  },
);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    input: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.foreground,
    },
  });
}
