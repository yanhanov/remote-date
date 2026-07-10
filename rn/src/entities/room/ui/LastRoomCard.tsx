import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { ClockCounterClockwise } from 'phosphor-react-native';
import type { RoomType, VideoRoom } from '@/shared/api/room.types';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface LastRoomCardProps {
  room: VideoRoom;
  roomType: RoomType;
  onPress: () => void;
}

function getAccent(colors: ThemeColors, roomType: RoomType) {
  if (roomType === 'youtube') return colors.youtube;
  if (roomType === 'soundcloud') return colors.soundcloud;
  return colors.belet;
}

function getSubtitle(room: VideoRoom, roomType: RoomType) {
  if (roomType === 'youtube' && room.youtubeVideoId) {
    return 'Continue where you left off';
  }
  if (roomType === 'soundcloud' && room.soundcloudTitle) {
    return room.soundcloudTitle;
  }
  if (roomType === 'belet' && room.beletTitle) {
    return room.beletTitle;
  }
  return `Room ${room.id.slice(0, 8)}`;
}

function getParticipantsLabel(count: number) {
  if (count === 0) return 'No one watching now';
  if (count === 1) return '1 watching';
  return `${count} watching`;
}

export function LastRoomCard({ room, roomType, onPress }: LastRoomCardProps) {
  const { colors } = useTheme();
  const accent = getAccent(colors, roomType);
  const styles = useMemo(() => createStyles(colors, accent), [colors, accent]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconWrap}>
        <ClockCounterClockwise size={16} color={accent} weight="bold" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Your last room</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {getSubtitle(room, roomType)}
        </Text>
        <Text style={styles.meta}>{getParticipantsLabel(room.participants ?? 0)}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, accent: string) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${accent}4D`,
      backgroundColor: `${accent}0F`,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    cardPressed: {
      backgroundColor: `${accent}1A`,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: `${accent}40`,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    meta: {
      fontSize: 11,
      color: `${colors.muted}CC`,
      marginTop: 4,
    },
  });
}
