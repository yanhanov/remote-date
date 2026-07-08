import { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import type { AppScreenProps } from '@/app/navigation/types';
import { useRoom } from '@/entities/room/model/useRoom';
import { RoomNotFound } from '@/entities/room/ui/RoomNotFound';
import { useChat } from '@/features/room-chat/model/useChat';
import { RoomChatPanel } from '@/features/room-chat/ui/RoomChatPanel';
import { YoutubePlayer, changeRoomVideo } from '@/features/room-player/ui/YoutubePlayer';
import { YoutubeVideoSearch } from '@/features/room-player/ui/YoutubeVideoSearch';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

export function RoomScreen({ route, navigation }: AppScreenProps<'Room'>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  useEffect(() => {
    void (async () => {
      try {
        await load();
        join();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load room';
        setError(message);
        Alert.alert('Error', message);
      }
    })();

    return () => leave();
  }, [roomId]);

  useEffect(() => {
    if (room && room.type !== 'youtube') {
      setError('This is not a YouTube room');
    }
  }, [room]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          Room {room.id.slice(0, 8)} · {participants} online
        </Text>
      </View>

      {room.youtubeVideoId ? (
        <YoutubePlayer roomId={roomId} room={room} loadedAt={loadedAt} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Search for a video to start watching.</Text>
        </View>
      )}

      <YoutubeVideoSearch
        onSelect={(video) => {
          changeRoomVideo(roomId, {
            videoId: video.videoId,
            youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
            title: video.title,
            channelTitle: video.channelTitle,
            thumbnailUrl: video.thumbnailUrl ?? undefined,
          });
          setRoom({
            ...room,
            youtubeVideoId: video.videoId,
            youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          });
        }}
      />

      <View style={styles.chat}>
        <RoomChatPanel
          messages={messages}
          newMessage={newMessage}
          onChangeMessage={setNewMessage}
          onSend={send}
          onSendImage={() => void sendFile('image')}
          onSendAudio={() => void sendFile('audio')}
          currentUserName={currentUserName}
        />
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      gap: 16,
      paddingBottom: 40,
    },
    meta: {
      paddingBottom: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.muted,
    },
    placeholder: {
      aspectRatio: 16 / 9,
      backgroundColor: '#000',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    placeholderText: {
      color: '#ffffff99',
      fontSize: 14,
      textAlign: 'center',
    },
    chat: {
      minHeight: 320,
    },
  });
}
