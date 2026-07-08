import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';

export function LoadingSpinner() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
