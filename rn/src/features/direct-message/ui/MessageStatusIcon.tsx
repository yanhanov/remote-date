import { View, StyleSheet } from 'react-native';
import { Check, Clock } from 'phosphor-react-native';
import type { DirectMessageStatus } from '@/shared/api/social.types';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface MessageStatusIconProps {
  status?: DirectMessageStatus;
}

export function MessageStatusIcon({ status = 'sent' }: MessageStatusIconProps) {
  const { colors } = useTheme();
  const tint =
    status === 'read' || status === 'delivered'
      ? `${colors.primaryForeground}CC`
      : `${colors.primaryForeground}8C`;

  if (status === 'sending') {
    return <Clock size={12} color={tint} />;
  }

  if (status === 'read') {
    return (
      <View style={styles.readChecks}>
        <Check size={12} color={tint} weight="bold" />
        <Check size={12} color={tint} weight="bold" style={styles.readCheckOverlay} />
      </View>
    );
  }

  return <Check size={12} color={tint} weight="bold" />;
}

const styles = StyleSheet.create({
  readChecks: {
    width: 16,
    height: 12,
    position: 'relative',
  },
  readCheckOverlay: {
    position: 'absolute',
    left: 6,
    top: 0,
  },
});
