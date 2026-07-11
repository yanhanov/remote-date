import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  TextInput,
} from 'react-native';
import {
  MagnifyingGlass,
  LinkSimple,
  X,
  Play,
  CaretDown,
  CaretUp,
} from 'phosphor-react-native';
import { youtubeAPI, type YoutubeVideo } from '@/shared/api/youtube.api';
import { extractYoutubeVideoId } from '@/shared/lib/youtube-url';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface YoutubeVideoSearchProps {
  onSelect: (video: YoutubeVideo) => void;
  compact?: boolean;
}

export function YoutubeVideoSearch({ onSelect, compact = false }: YoutubeVideoSearchProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YoutubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [focused, setFocused] = useState(false);

  const isLink = Boolean(extractYoutubeVideoId(query));
  const showDropdown = isSearching || results.length > 0 || Boolean(searchError);

  useEffect(() => {
    if (!compact) {
      setExpanded(true);
      return;
    }
    // Collapse after the player has a chance to paint — instant layout
    // swaps blank Android WebViews right after first frame.
    const t = setTimeout(() => setExpanded(false), Platform.OS === 'android' ? 600 : 0);
    return () => clearTimeout(t);
  }, [compact]);

  useEffect(() => {
    if (compact && expanded) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [compact, expanded]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      const videoId = extractYoutubeVideoId(query);
      if (videoId) {
        setResults([{ videoId, title: 'Play this YouTube link' }]);
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
    setFocused(false);
    inputRef.current?.blur();
    if (compact) {
      // LayoutAnimation blanks nested Android WebViews.
      if (Platform.OS !== 'android') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setExpanded(false);
    }
    onSelect(video);
  }

  function clearQuery() {
    setQuery('');
    setResults([]);
    setSearchError(null);
    inputRef.current?.focus();
  }

  function toggleExpanded() {
    if (Platform.OS !== 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded((v) => !v);
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

  if (compact && !expanded) {
    return (
      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.changeBtn, pressed && styles.changeBtnPressed]}
      >
        <View style={styles.changeIcon}>
          <MagnifyingGlass size={15} color={colors.youtube} weight="bold" />
        </View>
        <Text style={styles.changeBtnText}>Change video</Text>
        <CaretDown size={14} color={colors.muted} weight="bold" />
      </Pressable>
    );
  }

  return (
    <View style={styles.root} collapsable={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{compact ? 'Change video' : 'Find something to watch'}</Text>
          <Text style={styles.subtitle}>
            {compact
              ? 'New pick syncs for everyone in the room'
              : 'Search YouTube or paste a watch link'}
          </Text>
        </View>
        {compact ? (
          <Pressable
            onPress={toggleExpanded}
            hitSlop={8}
            style={({ pressed }) => [styles.collapseBtn, pressed && styles.collapseBtnPressed]}
            accessibilityLabel="Collapse search"
          >
            <CaretUp size={16} color={colors.muted} weight="bold" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchAnchor} collapsable={false}>
        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={[
            styles.field,
            (focused || isLink) && styles.fieldFocused,
            isLink && styles.fieldLink,
          ]}
        >
          <View style={styles.searchIcon} pointerEvents="none">
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.youtube} />
            ) : isLink ? (
              <LinkSimple size={18} color={colors.youtube} weight="bold" />
            ) : (
              <MagnifyingGlass
                size={18}
                color={focused ? colors.foreground : colors.muted}
                weight="bold"
              />
            )}
          </View>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Artist, movie, or youtube.com/…"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            blurOnSubmit={false}
            onSubmitEditing={submitSearch}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
            editable
          />
          {query.length > 0 ? (
            <Pressable
              onPress={clearQuery}
              hitSlop={8}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
              accessibilityLabel="Clear search"
            >
              <X size={14} color={colors.muted} weight="bold" />
            </Pressable>
          ) : null}
        </Pressable>

        {showDropdown ? (
          <View style={styles.dropdown}>
            <View style={styles.dropdownCard}>
              {searchError ? (
                <Text style={styles.error}>{searchError}</Text>
              ) : isSearching && results.length === 0 ? (
                <View style={styles.dropdownStatus}>
                  <ActivityIndicator size="small" color={colors.youtube} />
                  <Text style={styles.status}>Searching YouTube…</Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled
                  style={styles.dropdownScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {results.map((item, index) => {
                    const isPaste = !item.thumbnailUrl && isLink;
                    return (
                      <Pressable
                        key={`${item.videoId}-${index}`}
                        style={({ pressed }) => [
                          styles.resultRow,
                          index > 0 && styles.resultRowBorder,
                          pressed && styles.resultRowPressed,
                        ]}
                        onPress={() => selectVideo(item)}
                      >
                        <View style={styles.thumbWrap}>
                          {item.thumbnailUrl ? (
                            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
                          ) : (
                            <View style={[styles.thumb, styles.thumbPlaceholder]}>
                              <Play size={16} color={colors.youtube} weight="fill" />
                            </View>
                          )}
                        </View>
                        <View style={styles.resultBody}>
                          <Text style={styles.resultTitle} numberOfLines={2}>
                            {isPaste ? 'Play pasted link' : item.title}
                          </Text>
                          {item.channelTitle ? (
                            <Text style={styles.resultChannel} numberOfLines={1}>
                              {item.channelTitle}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.playPill}>
                          <Play size={11} color="#fff" weight="fill" />
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      gap: 12,
      zIndex: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
    },
    collapseBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.mutedBg,
    },
    collapseBtnPressed: {
      opacity: 0.75,
    },
    changeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 48,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    changeBtnPressed: {
      opacity: 0.88,
    },
    changeIcon: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.youtube}14`,
    },
    changeBtnText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    searchAnchor: {
      position: 'relative',
      zIndex: 50,
    },
    field: {
      position: 'relative',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    fieldFocused: {
      borderColor: `${colors.youtube}99`,
      ...(Platform.OS === 'web'
        ? { boxShadow: `0 0 0 3px ${colors.youtube}22` }
        : {
            shadowColor: colors.youtube,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
          }),
    },
    fieldLink: {
      borderColor: colors.youtube,
    },
    searchIcon: {
      position: 'absolute',
      left: 14,
      top: 0,
      bottom: 0,
      width: 22,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    input: {
      height: 48,
      borderWidth: 0,
      borderRadius: 14,
      paddingLeft: 44,
      paddingRight: 42,
      backgroundColor: 'transparent',
      fontSize: 15,
      color: colors.foreground,
      ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as const) : null),
    },
    clearBtn: {
      position: 'absolute',
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.mutedBg,
      zIndex: 2,
    },
    clearBtnPressed: {
      opacity: 0.75,
    },
    dropdown: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '100%',
      marginTop: 8,
      zIndex: 80,
      elevation: 30,
    },
    dropdownCard: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
      maxHeight: 300,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 16px 40px -12px rgba(0,0,0,0.35)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.22,
            shadowRadius: 18,
            elevation: 16,
          }),
    },
    dropdownScroll: {
      maxHeight: 300,
    },
    dropdownStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 16,
    },
    status: {
      fontSize: 13,
      color: colors.muted,
    },
    error: {
      fontSize: 13,
      color: colors.destructive,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    resultRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: `${colors.border}CC`,
    },
    resultRowPressed: {
      backgroundColor: colors.mutedBg,
    },
    thumbWrap: {
      borderRadius: 8,
      overflow: 'hidden',
    },
    thumb: {
      width: 88,
      height: 50,
      backgroundColor: colors.mutedBg,
    },
    thumbPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.youtube}14`,
    },
    resultBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    resultTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
      lineHeight: 17,
    },
    resultChannel: {
      fontSize: 12,
      color: colors.muted,
    },
    playPill: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.youtube,
    },
  });
}
