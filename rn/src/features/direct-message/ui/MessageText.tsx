import { useMemo } from 'react';
import { Text, Linking, StyleSheet } from 'react-native';
import { splitMessageLinks } from '@/shared/lib/format-message-links';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface MessageTextProps {
  text: string;
  isOwn?: boolean;
}

export function MessageText({ text, isOwn }: MessageTextProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, isOwn), [colors, isOwn]);
  const segments = useMemo(() => splitMessageLinks(text), [text]);

  return (
    <Text style={styles.text}>
      {segments.map((segment, index) => {
        if (segment.type === 'link') {
          return (
            <Text
              key={`${index}-${segment.href}`}
              style={styles.link}
              onPress={() => void Linking.openURL(segment.href)}
            >
              {segment.value}
            </Text>
          );
        }
        return <Text key={`${index}-text`}>{segment.value}</Text>;
      })}
    </Text>
  );
}

function createStyles(colors: ThemeColors, isOwn?: boolean) {
  return StyleSheet.create({
    text: {
      fontSize: 15,
      lineHeight: 22,
      color: isOwn ? colors.primaryForeground : colors.foreground,
    },
    link: {
      textDecorationLine: 'underline',
    },
  });
}
