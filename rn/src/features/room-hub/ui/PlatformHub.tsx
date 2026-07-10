import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Plus, LinkSimple, CircleNotch } from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { roomAPI } from '@/shared/api/room.api';
import type { VideoRoom } from '@/shared/api/room.types';
import type { AppStackParamList } from '@/app/navigation/types';
import { LastRoomCard } from '@/entities/room/ui/LastRoomCard';
import { YouTubeIcon, SoundCloudIcon, BeletIcon } from '@/shared/ui/icons/PlatformIcons';
import { Input } from '@/shared/ui/Input';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface PlatformConfig {
  title: string;
  tagline: string;
  description: string;
  createDescription: string;
  roomType: 'youtube' | 'soundcloud' | 'belet';
  roomRoute: 'Room' | 'SoundRoom' | 'BeletRoom';
  accent: string;
  Icon: typeof YouTubeIcon;
}

interface PlatformHubProps {
  platform: 'youtube' | 'soundcloud' | 'belet';
  navigation: NativeStackNavigationProp<
    AppStackParamList,
    'YoutubeHub' | 'SoundcloudHub' | 'BeletHub'
  >;
}

export function PlatformHub({ platform, navigation }: PlatformHubProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const configs = useMemo(
    (): Record<'youtube' | 'soundcloud' | 'belet', PlatformConfig> => ({
      youtube: {
        title: 'YouTube',
        tagline: 'Video rooms',
        description: 'Create a room or join by ID.',
        createDescription: 'Pick a video inside the room',
        roomType: 'youtube',
        roomRoute: 'Room',
        accent: colors.youtube,
        Icon: YouTubeIcon,
      },
      soundcloud: {
        title: 'SoundCloud',
        tagline: 'Music rooms',
        description: 'Create a room or join by ID.',
        createDescription: 'Pick a track inside the room',
        roomType: 'soundcloud',
        roomRoute: 'SoundRoom',
        accent: colors.soundcloud,
        Icon: SoundCloudIcon,
      },
      belet: {
        title: 'Belet',
        tagline: 'Movies & series',
        description: 'Create a room or join by ID.',
        createDescription: 'Share a Belet link inside the room',
        roomType: 'belet',
        roomRoute: 'BeletRoom',
        accent: colors.belet,
        Icon: BeletIcon,
      },
    }),
    [colors],
  );

  const config = configs[platform];
  const Icon = config.Icon;
  const [lastRoom, setLastRoom] = useState<VideoRoom | null>(null);
  const [lastRoomLoading, setLastRoomLoading] = useState(true);
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    void roomAPI
      .getLastRoom(config.roomType)
      .then(setLastRoom)
      .catch(() => setLastRoom(null))
      .finally(() => setLastRoomLoading(false));
  }, [config.roomType]);

  async function createRoom() {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const room = await roomAPI.createRoom({ type: config.roomType });
      navigation.navigate(config.roomRoute, { id: room.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      setCreateError(message);
      Alert.alert('Error', message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function joinRoom() {
    const id = roomIdToJoin.trim();
    if (!id) {
      setJoinError('Please enter a room ID');
      Alert.alert('Error', 'Please enter a room ID');
      return;
    }

    setJoinLoading(true);
    setJoinError(null);
    try {
      const room = await roomAPI.getRoom(id);
      if (room.type !== config.roomType) {
        const message = `This is not a ${config.title} room`;
        setJoinError(message);
        Alert.alert('Error', message);
        return;
      }
      navigation.navigate(config.roomRoute, { id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Room not found';
      setJoinError(message);
      Alert.alert('Error', message);
    } finally {
      setJoinLoading(false);
    }
  }

  if (lastRoomLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{config.tagline}</Text>
          <View style={styles.brand}>
            <View
              style={[
                styles.brandIcon,
                {
                  backgroundColor: `${config.accent}14`,
                  borderColor: `${config.accent}33`,
                },
              ]}
            >
              <Icon size={28} />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.description}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {lastRoom ? (
            <LastRoomCard
              room={lastRoom}
              roomType={config.roomType}
              onPress={() => navigation.navigate(config.roomRoute, { id: lastRoom.id })}
            />
          ) : null}

          <View style={styles.createBlock}>
            <Pressable
              onPress={() => void createRoom()}
              disabled={createLoading}
              style={({ pressed }) => [
                styles.createBtn,
                { backgroundColor: config.accent },
                pressed && !createLoading && styles.createBtnPressed,
                createLoading && styles.createBtnDisabled,
              ]}
            >
              {createLoading ? (
                <CircleNotch size={16} color="#fff" />
              ) : (
                <Plus size={16} color="#fff" weight="bold" />
              )}
              <Text style={styles.createBtnText}>
                {createLoading ? 'Creating...' : 'Create room'}
              </Text>
            </Pressable>
            <Text style={styles.createHint}>{config.createDescription}</Text>
            {createError ? <Text style={styles.error}>{createError}</Text> : null}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.joinCard}>
            <View style={styles.joinHeader}>
              <Text style={styles.joinEyebrow}>Have an invite?</Text>
              <Text style={styles.joinTitle}>Join by room ID</Text>
            </View>

            <View style={styles.joinRow}>
              <View style={styles.joinInputWrap}>
                <View style={styles.linkIcon} pointerEvents="none">
                  <LinkSimple size={16} color={colors.muted} weight="bold" />
                </View>
                <Input
                  value={roomIdToJoin}
                  onChangeText={setRoomIdToJoin}
                  placeholder="Paste room ID"
                  autoCapitalize="none"
                  style={styles.joinInput}
                  onSubmitEditing={() => void joinRoom()}
                  editable={!joinLoading}
                />
              </View>

              <Pressable
                onPress={() => void joinRoom()}
                disabled={joinLoading}
                style={({ pressed }) => [
                  styles.joinBtn,
                  { borderColor: `${config.accent}59`, backgroundColor: colors.card },
                  pressed && !joinLoading && { backgroundColor: `${config.accent}14` },
                  joinLoading && styles.joinBtnDisabled,
                ]}
              >
                <Text style={[styles.joinBtnText, { color: config.accent }]}>
                  {joinLoading ? '...' : 'Join'}
                </Text>
              </Pressable>
            </View>

            {joinError ? <Text style={styles.error}>{joinError}</Text> : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    container: {
      width: '100%',
      maxWidth: 448,
      gap: 32,
    },
    header: {
      gap: 12,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '500',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    brandIcon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 4,
      lineHeight: 20,
    },
    actions: {
      gap: 20,
    },
    createBlock: {
      gap: 8,
    },
    createBtn: {
      height: 48,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    createBtnPressed: {
      opacity: 0.92,
    },
    createBtnDisabled: {
      opacity: 0.6,
    },
    createBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    createHint: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: `${colors.border}B3`,
    },
    dividerText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.muted,
      backgroundColor: colors.background,
      paddingHorizontal: 4,
    },
    joinCard: {
      backgroundColor: `${colors.card}80`,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${colors.border}B3`,
      padding: 16,
      gap: 12,
    },
    joinHeader: {
      gap: 2,
    },
    joinEyebrow: {
      fontSize: 11,
      fontWeight: '500',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    joinTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    joinRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    joinInputWrap: {
      flex: 1,
      position: 'relative',
      minWidth: 0,
    },
    linkIcon: {
      position: 'absolute',
      left: 12,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 1,
    },
    joinInput: {
      height: 44,
      paddingLeft: 36,
      backgroundColor: colors.background,
      borderColor: `${colors.border}CC`,
    },
    joinBtn: {
      height: 44,
      minWidth: 72,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    joinBtnDisabled: {
      opacity: 0.6,
    },
    joinBtnText: {
      fontSize: 14,
      fontWeight: '600',
    },
    error: {
      fontSize: 12,
      color: colors.destructive,
    },
  });
}
