import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { PublicUserSummary } from '@/shared/api/social.types';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import type { ReactNode } from 'react';

interface FriendsMemberCardProps {
  user: PublicUserSummary;
  subtitle?: string;
  onPress?: () => void;
  actions?: ReactNode;
}

export function FriendsMemberCard({ user, subtitle, onPress, actions }: FriendsMemberCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <UserAvatar user={user} size="md" />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {user.displayName}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    actions: {
      flexShrink: 0,
    },
  });
}
