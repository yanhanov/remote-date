import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { createCommonStyles } from '@/shared/theme/styles';

export function AboutScreen() {
  const { colors } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);

  return (
    <View style={[commonStyles.screen, commonStyles.screenContent]}>
      <Text style={commonStyles.title}>About</Text>
      <Text style={commonStyles.subtitle}>Remote Date — watch and listen together in real time.</Text>
    </View>
  );
}
