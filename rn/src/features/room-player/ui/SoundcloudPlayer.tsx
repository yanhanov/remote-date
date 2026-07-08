import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { socketService } from '@/shared/api/socket.service';
import {
  soundCloudAPI,
  type SoundCloudTrack,
  type SoundCloudSearchItem,
} from '@/shared/api/soundcloud.api';
import type { VideoRoom, VideoState } from '@/shared/api/room.types';
import { Input } from '@/shared/ui/Input';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

function buildAudioHtml(streamUrl: string) {
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
<audio id="audio" controls autoplay style="width:100%;max-width:400px;">
<source src="${streamUrl}" type="audio/mpeg" />
</audio>
<script>
const audio = document.getElementById('audio');
audio.addEventListener('play', () => post('play', { currentTime: audio.currentTime }));
audio.addEventListener('pause', () => post('pause', { currentTime: audio.currentTime }));
audio.addEventListener('seeked', () => post('seek', { currentTime: audio.currentTime }));
function post(type, data) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
}
document.addEventListener('message', handle);
window.addEventListener('message', handle);
function handle(event) {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'sync') {
      audio.currentTime = data.currentTime || 0;
      if (data.isPlaying) audio.play(); else audio.pause();
    } else if (data.type === 'load') {
      audio.src = data.streamUrl;
      audio.load();
      audio.play();
    }
  } catch(e) {}
}
</script>
</body></html>`;
}

export function useSoundcloudPlayer(roomId: string, room: VideoRoom | null, loadedAt: number) {
  const webRef = useRef<WebView>(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [currentTrackArtist, setCurrentTrackArtist] = useState<string | null>(null);
  const [isSelectingTrack, setIsSelectingTrack] = useState(false);
  const isLocalAction = useRef(false);

  const postToPlayer = useCallback((data: object) => {
    webRef.current?.postMessage(JSON.stringify(data));
  }, []);

  useEffect(() => {
    if (!room?.soundcloudUrl) return;
    setCurrentTrackUrl(room.soundcloudUrl);
    setCurrentTrackTitle(room.soundcloudTitle ?? 'Current track');
    setCurrentTrackArtist(room.soundcloudArtist ?? null);
  }, [room]);

  useEffect(() => {
    const onTrackChange = (data: {
      trackUrl: string;
      title?: string;
      artist?: string;
    }) => {
      setCurrentTrackUrl(data.trackUrl);
      setCurrentTrackTitle(data.title ?? null);
      setCurrentTrackArtist(data.artist ?? null);
      postToPlayer({ type: 'load', streamUrl: data.trackUrl });
    };

    const onState = (state: VideoState) => {
      if (isLocalAction.current) return;
      postToPlayer({ type: 'sync', currentTime: state.currentTime, isPlaying: state.isPlaying });
    };

    socketService.on('audio:track_change', onTrackChange);
    socketService.on('video:state', onState);
    socketService.on('video:play', (d) => postToPlayer({ type: 'sync', currentTime: d.currentTime, isPlaying: true }));
    socketService.on('video:pause', (d) => postToPlayer({ type: 'sync', currentTime: d.currentTime, isPlaying: false }));

    return () => {
      socketService.off('audio:track_change', onTrackChange);
      socketService.off('video:state', onState);
    };
  }, [postToPlayer]);

  useEffect(() => {
    if (room && currentTrackUrl) {
      postToPlayer({
        type: 'sync',
        currentTime: room.currentTime ?? 0,
        isPlaying: room.isPlaying ?? false,
      });
    }
  }, [loadedAt, room, currentTrackUrl, postToPlayer]);

  async function selectTrack(track: SoundCloudTrack, queue: SoundCloudTrack[]) {
    setIsSelectingTrack(true);
    try {
      let playable = track;
      if (!playable.streamUrl) {
        playable = await soundCloudAPI.getTrack(track.id);
      }
      if (!playable.streamUrl) {
        Alert.alert('Error', 'This track cannot be played');
        return;
      }
      setCurrentTrackUrl(playable.streamUrl);
      setCurrentTrackTitle(playable.title);
      setCurrentTrackArtist(playable.username ?? null);
      socketService.emit('audio:track_change', {
        roomId,
        trackUrl: playable.streamUrl,
        title: playable.title,
        artist: playable.username,
        artworkUrl: playable.artworkUrl,
        queue: (queue.length ? queue : [playable]).map((t) => ({
          id: t.id,
          streamUrl: t.streamUrl ?? '',
          title: t.title,
          username: t.username,
          artworkUrl: t.artworkUrl,
          permalinkUrl: t.permalinkUrl,
          durationMs: t.durationMs,
        })),
        queueIndex: 0,
      });
      postToPlayer({ type: 'load', streamUrl: playable.streamUrl });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to select track');
    } finally {
      setIsSelectingTrack(false);
    }
  }

  return {
    webRef,
    currentTrackUrl,
    currentTrackTitle,
    currentTrackArtist,
    isSelectingTrack,
    selectTrack,
    postToPlayer,
    buildAudioHtml,
  };
}

interface SoundcloudTrackSearchProps {
  roomId: string;
  participants: number;
  isSelectingTrack?: boolean;
  onSelectTrack: (track: SoundCloudTrack, queue: SoundCloudTrack[]) => void;
}

export function SoundcloudTrackSearch({
  roomId,
  participants,
  isSelectingTrack,
  onSelectTrack,
}: SoundcloudTrackSearchProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SoundCloudSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const items = await soundCloudAPI.searchTracks(query.trim(), 20, 'tracks');
        setResults(
          [...items].sort((a, b) => {
            const playable = (item: SoundCloudSearchItem) =>
              'streamUrl' in item && item.streamUrl ? 0 : 1;
            return playable(a) - playable(b);
          }),
        );
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  function pickTrack(track: SoundCloudTrack) {
    const trackItems = results.filter(
      (s): s is SoundCloudTrack => !('kind' in s && s.kind === 'playlist'),
    );
    const selectedIndex = trackItems.findIndex((t) => t.id === track.id);
    const queue = selectedIndex !== -1 ? trackItems.slice(selectedIndex) : [track];
    setResults([]);
    setQuery('');
    onSelectTrack(track, queue);
  }

  return (
    <View style={styles.searchCard}>
      <Text style={styles.header}>
        SoundCloud Room · {roomId.slice(0, 8)} · {participants} online
      </Text>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search tracks or paste SoundCloud URL"
        autoCapitalize="none"
      />
      {(isSearching || isSelectingTrack) && <Text style={styles.status}>Loading...</Text>}
      {results.map((item) => {
        if ('kind' in item && item.kind === 'playlist') return null;
        const track = item as SoundCloudTrack;
        return (
          <Pressable key={track.id} style={styles.result} onPress={() => pickTrack(track)}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {track.title}
            </Text>
            {track.username ? (
              <Text style={styles.trackArtist} numberOfLines={1}>
                {track.username}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    searchCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    header: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    status: {
      fontSize: 12,
      color: colors.muted,
    },
    result: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    trackTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    trackArtist: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
  });
}
