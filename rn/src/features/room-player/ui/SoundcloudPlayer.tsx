import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { MagnifyingGlass } from 'phosphor-react-native';
import { socketService } from '@/shared/api/socket.service';
import {
  soundCloudAPI,
  type SoundCloudTrack,
  type SoundCloudSearchItem,
} from '@/shared/api/soundcloud.api';
import type { VideoRoom, VideoState } from '@/shared/api/room.types';
import type { SoundcloudAudioPlayerRef } from '@/features/room-player/ui/SoundcloudAudioPlayer';
import { Input } from '@/shared/ui/Input';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

export function useSoundcloudPlayer(roomId: string, room: VideoRoom | null, loadedAt: number) {
  const playerRef = useRef<SoundcloudAudioPlayerRef>(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [currentTrackArtist, setCurrentTrackArtist] = useState<string | null>(null);
  const [isSelectingTrack, setIsSelectingTrack] = useState(false);
  const isLocalAction = useRef(false);

  const postToPlayer = useCallback((data: { type: string; streamUrl?: string; currentTime?: number; isPlaying?: boolean }) => {
    if (data.type === 'load' && data.streamUrl) {
      playerRef.current?.load(data.streamUrl);
      return;
    }
    if (data.type === 'sync') {
      playerRef.current?.sync(data.currentTime ?? 0, data.isPlaying ?? false);
    }
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
    socketService.on('video:play', (d) =>
      postToPlayer({ type: 'sync', currentTime: d.currentTime, isPlaying: true }),
    );
    socketService.on('video:pause', (d) =>
      postToPlayer({ type: 'sync', currentTime: d.currentTime, isPlaying: false }),
    );

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

  async function loadFromChat(url: string) {
    if (!url) return;

    setCurrentTrackUrl(url);
    setCurrentTrackTitle('Shared track');
    setCurrentTrackArtist(null);
    socketService.emit('audio:track_change', {
      roomId,
      trackUrl: url,
      title: 'Shared track',
      queue: [
        {
          id: url,
          streamUrl: url,
          title: 'Shared track',
          permalinkUrl: url,
          durationMs: 0,
        },
      ],
      queueIndex: 0,
    });
    postToPlayer({ type: 'load', streamUrl: url });
  }

  return {
    playerRef,
    currentTrackUrl,
    currentTrackTitle,
    currentTrackArtist,
    isSelectingTrack,
    selectTrack,
    loadFromChat,
  };
}

interface SoundcloudTrackSearchProps {
  isSelectingTrack?: boolean;
  onSelectTrack: (track: SoundCloudTrack, queue: SoundCloudTrack[]) => void;
}

export function SoundcloudTrackSearch({
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
    }, 400);
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
    <View style={styles.root}>
      <View style={styles.field}>
        <View style={styles.searchIcon} pointerEvents="none">
          <MagnifyingGlass size={18} color={colors.muted} weight="bold" />
        </View>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search tracks or paste SoundCloud URL"
          autoCapitalize="none"
          style={styles.input}
        />
      </View>

      {(isSearching || isSelectingTrack) && <Text style={styles.status}>Loading...</Text>}

      {results.length > 0 ? (
        <View style={styles.results}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.resultsScroll}>
            {results.map((item) => {
              if ('kind' in item && item.kind === 'playlist') return null;
              const track = item as SoundCloudTrack;
              return (
                <Pressable
                  key={track.id}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                  onPress={() => pickTrack(track)}
                >
                  <View style={styles.itemBody}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {track.title}
                    </Text>
                    {track.username ? (
                      <Text style={styles.trackArtist} numberOfLines={1}>
                        {track.username}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      gap: 10,
    },
    field: {
      position: 'relative',
    },
    searchIcon: {
      position: 'absolute',
      left: 14,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 1,
    },
    input: {
      height: 40,
      paddingLeft: 40,
      backgroundColor: `${colors.background}99`,
      borderColor: `${colors.border}99`,
    },
    status: {
      fontSize: 12,
      color: colors.muted,
    },
    results: {
      maxHeight: 220,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: `${colors.border}99`,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    resultsScroll: {
      maxHeight: 220,
    },
    item: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    itemPressed: {
      backgroundColor: colors.mutedBg,
    },
    itemBody: {
      minWidth: 0,
    },
    trackTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.foreground,
    },
    trackArtist: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
  });
}
