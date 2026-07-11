import { useEffect, useState } from 'react';
import type { AppScreenProps } from '@/app/navigation/types';
import { useRoom } from '@/entities/room/model/useRoom';
import { useRoomScreenLifecycle } from '@/entities/room/model/useRoomScreenLifecycle';
import { RoomNotFound } from '@/entities/room/ui/RoomNotFound';
import { RoomScreenLayout } from '@/entities/room/ui/RoomScreenLayout';
import { useChat } from '@/features/room-chat/model/useChat';
import { RoomFloatingChat } from '@/features/room-chat/ui/RoomFloatingChat';
import { YoutubePlayer, changeRoomVideo } from '@/features/room-player/ui/YoutubePlayer';
import { YoutubeRoomStage } from '@/features/room-player/ui/YoutubeRoomStage';
import { RoomInviteModal } from '@/features/room-share/ui/RoomInviteModal';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { youtubeWatchUrl } from '@/shared/lib/youtube-url';

export function RoomScreen({ route, navigation }: AppScreenProps<'Room'>) {
  const [inviteOpen, setInviteOpen] = useState(false);
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

  const hasVideo = Boolean(room.youtubeVideoId);

  function handleVideoSelect(video: {
    videoId: string;
    title?: string;
    channelTitle?: string;
    thumbnailUrl?: string | null;
  }) {
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
      main={
        <YoutubeRoomStage
          roomId={room.id}
          participants={participants}
          hasVideo={hasVideo}
          title={hasVideo ? nowPlayingTitle : null}
          channelTitle={hasVideo ? nowPlayingChannel : null}
          onInvite={() => setInviteOpen(true)}
          onSelectVideo={handleVideoSelect}
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
