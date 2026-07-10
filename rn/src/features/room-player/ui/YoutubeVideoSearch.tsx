import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { MagnifyingGlass } from 'phosphor-react-native';
import { youtubeAPI, type YoutubeVideo } from '@/shared/api/youtube.api';
import { extractYoutubeVideoId } from '@/shared/lib/youtube-url';
import { Input } from '@/shared/ui/Input';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface YoutubeVideoSearchProps {
  onSelect: (video: YoutubeVideo) => void;
}

export function YoutubeVideoSearch({ onSelect }: YoutubeVideoSearchProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YoutubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      const videoId = extractYoutubeVideoId(query);
      if (videoId) {
        setResults([{ videoId, title: 'YouTube video' }]);
        setSearchError(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      try {
        setResults(await youtubeAPI.searchVideos(query.trim(), 10));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setSearchError(message);
        setResults([]);
        Alert.alert('Error', message);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  function selectVideo(video: YoutubeVideo) {
    setQuery('');
    setResults([]);
    setSearchError(null);
    onSelect(video);
  }

  function submitSearch() {
    const videoId = extractYoutubeVideoId(query);
    if (videoId) {
      selectVideo({ videoId, title: 'YouTube video' });
      return;
    }
    if (results.length === 1) {
      selectVideo(results[0]!);
    }
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
          placeholder="Search or paste YouTube link"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={submitSearch}
          style={styles.input}
        />
      </View>

      {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
      {!searchError && isSearching ? (
        <Text style={styles.status}>Searching...</Text>
      ) : null}

      {results.length > 0 ? (
        <View style={styles.results}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.resultsScroll}
          >
            {results.map((item) => (
              <Pressable
                key={item.videoId}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={() => selectVideo(item)}
              >
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]} />
                )}
                <View style={styles.itemBody}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.channelTitle ? (
                    <Text style={styles.channel} numberOfLines={1}>
                      {item.channelTitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
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
    error: {
      fontSize: 12,
      color: colors.destructive,
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
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    itemPressed: {
      backgroundColor: colors.mutedBg,
    },
    thumb: {
      width: 48,
      height: 36,
      borderRadius: 6,
      backgroundColor: colors.mutedBg,
    },
    thumbPlaceholder: {
      backgroundColor: colors.muted,
    },
    itemBody: {
      flex: 1,
      justifyContent: 'center',
      minWidth: 0,
    },
    title: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.foreground,
    },
    channel: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
  });
}
