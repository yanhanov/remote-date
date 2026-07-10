import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { RoomInvitePayload } from '@/shared/lib/room-invite-message';
import type { AppStackParamList } from '@/app/navigation/types';
import type { RoomType } from '@/shared/api/room.types';
import { YouTubeIcon, SoundCloudIcon, BeletIcon } from '@/shared/ui/icons/PlatformIcons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

function roomRoute(roomType: RoomType): 'Room' | 'SoundRoom' | 'BeletRoom' {
  switch (roomType) {
    case 'youtube':
      return 'Room';
    case 'soundcloud':
      return 'SoundRoom';
    case 'belet':
      return 'BeletRoom';
  }
}

interface RoomInviteMessageProps {
  invite: RoomInvitePayload;
  isOwn?: boolean;
  createdAt?: string;
  navigation: NavigationProp<AppStackParamList>;
}

export function RoomInviteMessage({
  invite,
  isOwn,
  createdAt,
  navigation,
}: RoomInviteMessageProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const title = isOwn ? 'You sent a watch party invite' : 'Watch party invite';
  const subtitle = isOwn
    ? `Waiting for them to join your ${invite.label.toLowerCase()}`
    : `${invite.inviterName} invited you to join`;

  const formattedTime = createdAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(createdAt))
    : '';

  const Icon =
    invite.roomType === 'youtube'
      ? YouTubeIcon
      : invite.roomType === 'belet'
        ? BeletIcon
        : SoundCloudIcon;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Icon size={16} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{invite.label}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Pressable
          onPress={() =>
            navigation.navigate(roomRoute(invite.roomType), { id: invite.roomId })
          }
          style={({ pressed }) => [styles.joinBtn, pressed && styles.joinBtnPressed]}
        >
          <Text style={styles.joinBtnText}>Join room</Text>
        </Pressable>
      </View>

      {formattedTime ? (
        <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
          {formattedTime}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 352,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${colors.primary}40`,
      backgroundColor: colors.card,
      overflow: 'hidden',
      paddingBottom: 28,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.primary}26`,
      backgroundColor: `${colors.primary}0D`,
    },
    badge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: `${colors.primary}26`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.primary,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
      marginTop: 2,
    },
    body: {
      padding: 16,
      gap: 12,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
    },
    joinBtn: {
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    joinBtnPressed: {
      opacity: 0.9,
    },
    joinBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primaryForeground,
    },
    time: {
      position: 'absolute',
      bottom: 8,
      fontSize: 10,
      color: colors.muted,
    },
    timeOwn: {
      right: 12,
    },
    timeOther: {
      left: 12,
    },
  });
}
