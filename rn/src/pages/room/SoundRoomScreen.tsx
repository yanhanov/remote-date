import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AppScreenProps } from '@/app/navigation/types';
import { useRoom } from '@/entities/room/model/useRoom';
import { useRoomScreenLifecycle } from '@/entities/room/model/useRoomScreenLifecycle';
import { RoomNotFound } from '@/entities/room/ui/RoomNotFound';
import {
  RoomInviteButton,
  RoomPanelCard,
  RoomScreenLayout,
} from '@/entities/room/ui/RoomScreenLayout';
import { RoomPlayerCard } from '@/entities/room/ui/RoomPlayerCard';
import { useChat } from '@/features/room-chat/model/useChat';
import { RoomChatPanel } from '@/features/room-chat/ui/RoomChatPanel';
import { SoundcloudAudioPlayer } from '@/features/room-player/ui/SoundcloudAudioPlayer';
import {
  useSoundcloudPlayer,
  SoundcloudTrackSearch,
} from '@/features/room-player/ui/SoundcloudPlayer';
import { RoomInviteModal } from '@/features/room-share/ui/RoomInviteModal';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

export function SoundRoomScreen({ route, navigation }: AppScreenProps<'SoundRoom'>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [inviteOpen, setInviteOpen] = useState(false);

  const roomId = route.params.id;
  const {
    room,
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

  const player = useSoundcloudPlayer(roomId, room, loadedAt);

  useRoomScreenLifecycle(roomId, navigation, { load, join, leave, setError });

  useEffect(() => {
    if (room && room.type !== 'soundcloud') {
      setError('SoundCloud room not found');
    }
  }, [room]);

  if (loading) return <LoadingSpinner />;

  if (error || !room) {
    return (
      <RoomNotFound
        roomId={roomId}
        roomType="soundcloud"
        error={error ?? 'Room not found'}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  const hasTrack = Boolean(player.currentTrackUrl);

  return (
    <RoomScreenLayout
      main={
        <>
          <RoomPanelCard
            title="Choose a track"
            description="Everyone in the room listens to the same track."
          >
            <SoundcloudTrackSearch
              isSelectingTrack={player.isSelectingTrack}
              onSelectTrack={player.selectTrack}
            />
          </RoomPanelCard>

          <RoomPlayerCard
            roomId={room.id}
            participants={participants}
            hasContent={hasTrack}
            placeholder="Search for a track to start listening."
            headerAction={<RoomInviteButton onPress={() => setInviteOpen(true)} />}
          >
            {hasTrack ? (
              <View style={styles.playerWrap}>
                <View style={styles.nowPlaying}>
                  <Text style={styles.nowPlayingLabel}>Now playing</Text>
                  <Text style={styles.trackTitle}>
                    {player.currentTrackTitle ?? 'Current track'}
                  </Text>
                  {player.currentTrackArtist ? (
                    <Text style={styles.trackArtist}>{player.currentTrackArtist}</Text>
                  ) : null}
                </View>
                <SoundcloudAudioPlayer
                  ref={player.playerRef}
                  streamUrl={player.currentTrackUrl!}
                />
              </View>
            ) : null}
          </RoomPlayerCard>
        </>
      }
      chat={
        <RoomChatPanel
          messages={messages}
          newMessage={newMessage}
          onChangeMessage={setNewMessage}
          onSend={send}
          onSendFile={(mode) => void sendFile(mode)}
          onPlayTrack={(url) => void player.loadFromChat(url)}
          currentUserName={currentUserName}
        />
      }
      footer={
        <RoomInviteModal
          visible={inviteOpen}
          roomId={roomId}
          roomType="soundcloud"
          onClose={() => setInviteOpen(false)}
        />
      }
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    playerWrap: {
      flex: 1,
      justifyContent: 'flex-end',
      gap: 12,
      padding: 12,
    },
    nowPlaying: {
      gap: 4,
    },
    nowPlayingLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      color: '#ffffff80',
    },
    trackTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    trackArtist: {
      fontSize: 13,
      color: '#ffffff99',
    },
    audio: {
      height: 48,
    },
  });
}
