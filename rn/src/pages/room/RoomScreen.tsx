import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowsIn, UserPlus } from 'phosphor-react-native';
import type { AppScreenProps } from '@/app/navigation/types';
import { useRoom } from '@/entities/room/model/useRoom';
import { useRoomScreenLifecycle } from '@/entities/room/model/useRoomScreenLifecycle';
import { RoomNotFound } from '@/entities/room/ui/RoomNotFound';
import { RoomScreenLayout } from '@/entities/room/ui/RoomScreenLayout';
import { useChat } from '@/features/room-chat/model/useChat';
import { RoomFloatingChat } from '@/features/room-chat/ui/RoomFloatingChat';
import { YoutubePlayer, changeRoomVideo } from '@/features/room-player/ui/YoutubePlayer';
import { YoutubeRoomStage } from '@/features/room-player/ui/YoutubeRoomStage';
import { useRoomTheater } from '@/features/room-player/model/use-room-theater';
import { RoomInviteModal } from '@/features/room-share/ui/RoomInviteModal';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { youtubeWatchUrl } from '@/shared/lib/youtube-url';
import { useResponsive } from '@/shared/lib/use-responsive';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import type { YoutubeVideo } from '@/shared/api/youtube.api';

export function RoomScreen({ route, navigation }: AppScreenProps<'Room'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isMobile } = useResponsive();
  const { setTheater } = useRoomTheater();
  const styles = useMemo(
    () => createTheaterChromeStyles(colors, insets.top),
    [colors, insets.top],
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [localTheater, setLocalTheater] = useState(false);
  const [nowPlayingTitle, setNowPlayingTitle] = useState<string | null>(null);
  const [nowPlayingChannel, setNowPlayingChannel] = useState<string | null>(null);

  const roomId = route.params.id;
  const {
    room,
    setRoom,
    loading,
    error,
    setError,
    participants,
    loadedAt,
    load,
    join,
    leave,
  } = useRoom(roomId);

  const { messages, newMessage, setNewMessage, send, sendFile, currentUserName } =
    useChat(roomId);

  useRoomScreenLifecycle(roomId, navigation, { load, join, leave, setError });

  useEffect(() => {
    if (room && room.type !== 'youtube') {
      setError('This is not a YouTube room');
    }
  }, [room, setError]);

  const hasVideo = Boolean(room?.youtubeVideoId);
  const theaterActive = localTheater && hasVideo && isMobile;

  useEffect(() => {
    if (!hasVideo) setLocalTheater(false);
  }, [hasVideo]);

  useEffect(() => {
    setTheater(theaterActive);
    navigation.setOptions({ headerShown: !theaterActive });
    return () => {
      setTheater(false);
      navigation.setOptions({ headerShown: true });
    };
  }, [theaterActive, setTheater, navigation]);

  useEffect(() => {
    if (!theaterActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLocalTheater(false);
      return true;
    });
    return () => sub.remove();
  }, [theaterActive]);

  if (loading) return <LoadingSpinner />;

  if (error || !room) {
    return (
      <RoomNotFound
        roomId={roomId}
        roomType="youtube"
        error={error ?? 'Room not found'}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  function handleVideoSelect(video: YoutubeVideo) {
    changeRoomVideo(roomId, {
      videoId: video.videoId,
      youtubeUrl: youtubeWatchUrl(video.videoId),
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl ?? undefined,
    });
    setRoom({
      ...room!,
      youtubeVideoId: video.videoId,
      youtubeUrl: youtubeWatchUrl(video.videoId),
    });
    setNowPlayingTitle(video.title ?? null);
    setNowPlayingChannel(video.channelTitle ?? null);
  }

  return (
    <RoomScreenLayout
      fullscreen={theaterActive}
      main={
        <YoutubeRoomStage
          roomId={room.id}
          participants={participants}
          hasVideo={hasVideo}
          title={hasVideo ? nowPlayingTitle : null}
          channelTitle={hasVideo ? nowPlayingChannel : null}
          onInvite={() => setInviteOpen(true)}
          onSelectVideo={handleVideoSelect}
          onEnterFullscreen={
            isMobile && hasVideo ? () => setLocalTheater(true) : undefined
          }
          fullscreen={theaterActive}
          fullscreenChrome={
            theaterActive ? (
              <View style={styles.topBar} pointerEvents="box-none">
                <View style={styles.topBarInner}>
                  <Pressable
                    onPress={() => setLocalTheater(false)}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                    accessibilityLabel="Exit fullscreen"
                  >
                    <ArrowsIn size={20} color="#fff" weight="bold" />
                  </Pressable>

                  <View style={styles.topMeta}>
                    <Text style={styles.topMetaTitle} numberOfLines={1}>
                      {nowPlayingTitle ?? 'YouTube room'}
                    </Text>
                    <Text style={styles.topMetaSub} numberOfLines={1}>
                      {room.id.slice(0, 8)} · {participants} watching
                      {nowPlayingChannel ? ` · ${nowPlayingChannel}` : ''}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setInviteOpen(true)}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                    accessibilityLabel="Invite participant"
                  >
                    <UserPlus size={20} color="#fff" weight="bold" />
                  </Pressable>
                </View>
              </View>
            ) : null
          }
        >
          {hasVideo ? (
            <YoutubePlayer roomId={roomId} room={room} loadedAt={loadedAt} />
          ) : null}
        </YoutubeRoomStage>
      }
      floatingChat={
        <RoomFloatingChat
          messages={messages}
          newMessage={newMessage}
          onChangeMessage={setNewMessage}
          onSend={send}
          onSendFile={(mode) => void sendFile(mode)}
          currentUserName={currentUserName}
          messageCount={messages.length}
          theater={theaterActive}
        />
      }
      footer={
        <RoomInviteModal
          visible={inviteOpen}
          roomId={roomId}
          roomType="youtube"
          onClose={() => setInviteOpen(false)}
        />
      }
    />
  );
}

function createTheaterChromeStyles(_colors: ThemeColors, topInset: number) {
  return StyleSheet.create({
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: topInset,
      zIndex: 20,
    },
    topBarInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    topMeta: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 4,
      gap: 1,
    },
    topMetaTitle: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    topMetaSub: {
      color: 'rgba(255,255,255,0.55)',
      fontSize: 11,
      fontWeight: '500',
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    iconBtnPressed: {
      opacity: 0.7,
    },
  });
}
