import { Pressable, StyleSheet } from 'react-native';
import { Sun, Moon } from 'phosphor-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface ThemeToggleProps {
  size?: number;
}

export function ThemeToggle({ size = 20 }: ThemeToggleProps) {
  const { isDark, toggleTheme, colors } = useTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      hitSlop={8}
    >
      {isDark ? (
        <Sun size={size} color={colors.foreground} weight="duotone" />
      ) : (
        <Moon size={size} color={colors.foreground} weight="duotone" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
