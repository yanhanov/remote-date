import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { youtubeAPI, type YoutubeVideo } from '@/shared/api/youtube.api';
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

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        setResults(await youtubeAPI.searchVideos(query.trim(), 10));
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.container}>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search videos or paste YouTube URL"
        autoCapitalize="none"
      />
      {isSearching ? <Text style={styles.status}>Searching...</Text> : null}
      <FlatList
        data={results}
        keyExtractor={(item) => item.videoId}
        style={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => onSelect(item)}>
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
        )}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 8,
      maxHeight: 220,
    },
    status: {
      fontSize: 12,
      color: colors.muted,
    },
    list: {
      flexGrow: 0,
    },
    item: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    thumb: {
      width: 80,
      height: 45,
      borderRadius: 6,
      backgroundColor: colors.mutedBg,
    },
    thumbPlaceholder: {
      backgroundColor: colors.muted,
    },
    itemBody: {
      flex: 1,
      justifyContent: 'center',
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
