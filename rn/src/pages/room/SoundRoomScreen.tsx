import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

const WebViewAny = WebView as unknown as React.ComponentType<Record<string, unknown>>;
import type { AppScreenProps } from '@/app/navigation/types';
import { useRoom } from '@/entities/room/model/useRoom';
import { RoomNotFound } from '@/entities/room/ui/RoomNotFound';
import { useChat } from '@/features/room-chat/model/useChat';
import { RoomChatPanel } from '@/features/room-chat/ui/RoomChatPanel';
import {
  useSoundcloudPlayer,
  SoundcloudTrackSearch,
} from '@/features/room-player/ui/SoundcloudPlayer';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

export function SoundRoomScreen({ route, navigation }: AppScreenProps<'SoundRoom'>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SoundcloudTrackSearch
        roomId={room.id}
        participants={participants}
        isSelectingTrack={player.isSelectingTrack}
        onSelectTrack={player.selectTrack}
      />

      <View style={styles.nowPlaying}>
        <Text style={styles.nowPlayingLabel}>Now playing</Text>
        <Text style={styles.trackTitle}>{player.currentTrackTitle ?? 'No track selected'}</Text>
        {player.currentTrackArtist ? (
          <Text style={styles.trackArtist}>{player.currentTrackArtist}</Text>
        ) : null}
      </View>

      {player.currentTrackUrl ? (
        <View style={styles.player}>
          <WebViewAny
            ref={player.webRef}
            source={{ html: player.buildAudioHtml(player.currentTrackUrl) }}
            style={styles.webview}
            javaScriptEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      ) : null}

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
    nowPlaying: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    nowPlayingLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      color: colors.muted,
      marginBottom: 4,
    },
    trackTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    trackArtist: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 4,
    },
    player: {
      height: 80,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#111',
    },
    webview: {
      flex: 1,
      backgroundColor: '#111',
    },
    chat: {
      minHeight: 320,
    },
  });
}
