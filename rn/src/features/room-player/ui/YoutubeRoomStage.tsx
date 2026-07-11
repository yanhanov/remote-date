import { useMemo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { UserPlus, Play, UsersThree, ArrowsOut } from 'phosphor-react-native';
import { YouTubeIcon } from '@/shared/ui/icons/PlatformIcons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import { YoutubeVideoSearch } from '@/features/room-player/ui/YoutubeVideoSearch';
import type { YoutubeVideo } from '@/shared/api/youtube.api';

interface YoutubeRoomStageProps {
  roomId: string;
  participants: number;
  hasVideo: boolean;
  title?: string | null;
  channelTitle?: string | null;
  onInvite: () => void;
  onSelectVideo: (video: YoutubeVideo) => void;
  /** Mobile: open our custom fullscreen (only when a video is playing). */
  onEnterFullscreen?: () => void;
  /** Expand the existing player in-place — do not remount WebView. */
  fullscreen?: boolean;
  fullscreenChrome?: ReactNode;
  children: ReactNode;
}

export function YoutubeRoomStage({
  roomId,
  participants,
  hasVideo,
  title,
  channelTitle,
  onInvite,
  onSelectVideo,
  onEnterFullscreen,
  fullscreen = false,
  fullscreenChrome,
  children,
}: YoutubeRoomStageProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={fullscreen ? styles.stageFullscreen : styles.stage} collapsable={false}>
      {!fullscreen ? (
        <View style={styles.dock}>
          <YoutubeVideoSearch onSelect={onSelectVideo} compact={hasVideo} />
        </View>
      ) : null}

      <View style={fullscreen ? styles.cinemaFullscreen : styles.cinema} collapsable={false}>
        {!fullscreen ? (
          <View style={styles.metaBar}>
            <View style={styles.metaLeft}>
              <View style={[styles.livePill, hasVideo && styles.livePillOn]}>
                <View style={[styles.liveDot, hasVideo && styles.liveDotOn]} />
                <Text style={[styles.liveText, hasVideo && styles.liveTextOn]}>
                  {hasVideo ? 'Live' : 'Ready'}
                </Text>
              </View>

              <View style={styles.metaChip}>
                <Text style={styles.metaChipText} numberOfLines={1}>
                  {roomId.slice(0, 8)}
                </Text>
              </View>

              <View style={styles.metaChip}>
                <UsersThree size={13} color="rgba(255,255,255,0.55)" weight="bold" />
                <Text style={styles.metaChipText}>{participants}</Text>
              </View>
            </View>

            <View style={styles.metaActions}>
              {hasVideo && onEnterFullscreen ? (
                <Pressable
                  onPress={onEnterFullscreen}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                  accessibilityLabel="Enter fullscreen"
                >
                  <ArrowsOut size={16} color="#fff" weight="bold" />
                </Pressable>
              ) : null}

              <Pressable
                onPress={onInvite}
                style={({ pressed }) => [styles.inviteBtn, pressed && styles.inviteBtnPressed]}
                accessibilityLabel="Invite participant"
              >
                <UserPlus size={16} color="#fff" weight="bold" />
                <Text style={styles.inviteLabel}>Invite</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View
          style={fullscreen ? styles.screenShellFullscreen : styles.screenShell}
          collapsable={false}
        >
          {hasVideo && !fullscreen ? (
            <View style={styles.ambientGlow} pointerEvents="none" />
          ) : null}

          <View style={fullscreen ? styles.bezelFullscreen : styles.bezel} collapsable={false}>
            {/*
              Do not merge normal/fullscreen viewport styles — RN cannot clear
              aspectRatio with `undefined`, which left a 16:9 box and blanked the WebView.
            */}
            <View
              style={fullscreen ? styles.viewportFullscreen : styles.viewport}
              collapsable={false}
            >
              {!hasVideo ? (
                <View style={styles.empty}>
                  <View style={styles.emptyGlow} />
                  <View style={styles.emptyRing} />
                  <View style={styles.emptyBadge}>
                    <YouTubeIcon size={40} />
                  </View>
                  <Text style={styles.emptyTitle}>Watch together</Text>
                  <Text style={styles.emptyCopy}>
                    Search above to pick a video — everyone stays in sync.
                  </Text>
                  <View style={styles.emptyHint}>
                    <Play size={11} color="rgba(255,255,255,0.55)" weight="fill" />
                    <Text style={styles.emptyHintText}>Waiting for a first pick</Text>
                  </View>
                </View>
              ) : null}

              <View
                style={styles.playerSlot}
                pointerEvents={hasVideo ? 'auto' : 'none'}
                collapsable={false}
              >
                {children}
              </View>
            </View>
          </View>
        </View>

        {fullscreen ? fullscreenChrome : null}

        {!fullscreen && hasVideo && (title || channelTitle) ? (
          <View style={styles.nowPlaying}>
            <View style={styles.nowPlayingIcon}>
              <Play size={12} color="#fff" weight="fill" />
            </View>
            <View style={styles.nowPlayingBody}>
              {title ? (
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              {channelTitle ? (
                <Text style={styles.videoChannel} numberOfLines={1}>
                  {channelTitle}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {!fullscreen && !(hasVideo && (title || channelTitle)) ? (
          <View style={styles.footerStrip}>
            <View style={styles.redEdge} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    stage: {
      overflow: 'visible',
      zIndex: 2,
      gap: 0,
    },
    stageFullscreen: {
      flex: 1,
      minHeight: 0,
      backgroundColor: '#000',
      zIndex: 50,
      overflow: 'visible',
    },
    dock: {
      zIndex: 40,
      overflow: 'visible',
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: 0,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 14,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 8px 28px -16px rgba(0,0,0,0.2)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }),
    },
    cinema: {
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
      // Android WebView renders blank under overflow:hidden + elevation ancestors.
      overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
      backgroundColor: '#0b0b10',
      borderWidth: StyleSheet.hairlineWidth,
      borderTopWidth: 0,
      borderColor: colors.border,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 28px 56px -28px rgba(0,0,0,0.55)' }
        : Platform.OS === 'ios'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.28,
              shadowRadius: 28,
            }
          : null),
    },
    cinemaFullscreen: {
      flex: 1,
      minHeight: 0,
      borderRadius: 0,
      borderWidth: 0,
      backgroundColor: '#000',
      overflow: 'visible',
    },
    metaBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 10,
      backgroundColor: '#0b0b10',
    },
    metaLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    },
    metaActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    iconBtnPressed: {
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 30,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    livePillOn: {
      backgroundColor: 'rgba(255,0,0,0.14)',
      borderColor: 'rgba(255,0,0,0.35)',
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.35)',
    },
    liveDotOn: {
      backgroundColor: colors.youtube,
    },
    liveText: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.7)',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    liveTextOn: {
      color: '#fff',
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 30,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.08)',
      maxWidth: 110,
    },
    metaChipText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.55)',
      fontVariant: ['tabular-nums'],
    },
    inviteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    inviteBtnPressed: {
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    inviteLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    screenShell: {
      paddingHorizontal: 10,
      paddingBottom: 10,
      position: 'relative',
    },
    screenShellFullscreen: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: 0,
      paddingBottom: 0,
      position: 'relative',
    },
    ambientGlow: {
      position: 'absolute',
      left: 24,
      right: 24,
      top: 18,
      bottom: 4,
      borderRadius: 20,
      backgroundColor: 'rgba(255,0,0,0.16)',
      opacity: 0.55,
    },
    bezel: {
      borderRadius: Platform.OS === 'android' ? 0 : 14,
      padding: Platform.OS === 'android' ? 0 : 3,
      backgroundColor: '#16161d',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.1)',
      overflow: Platform.OS === 'android' ? 'visible' : undefined,
      ...(Platform.OS === 'web'
        ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }
        : null),
    },
    bezelFullscreen: {
      flex: 1,
      minHeight: 0,
      borderRadius: 0,
      padding: 0,
      borderWidth: 0,
      backgroundColor: '#000',
      overflow: 'visible',
    },
    viewport: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#000',
      borderRadius: Platform.OS === 'android' ? 0 : 11,
      overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
      position: 'relative',
    },
    viewportFullscreen: {
      flex: 1,
      minHeight: 0,
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: '#000',
      borderRadius: 0,
      overflow: 'visible',
      position: 'relative',
    },
    empty: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      gap: 8,
      zIndex: 0,
      backgroundColor: '#08080c',
    },
    emptyGlow: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: 'rgba(255,0,0,0.16)',
      top: '18%',
    },
    emptyRing: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    emptyBadge: {
      width: 84,
      height: 84,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.12)',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 12px 32px -10px rgba(255,0,0,0.35)' }
        : {
            shadowColor: colors.youtube,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 16,
            elevation: 4,
          }),
    },
    emptyTitle: {
      marginTop: 10,
      fontSize: 23,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: -0.7,
    },
    emptyCopy: {
      fontSize: 13,
      lineHeight: 19,
      color: 'rgba(255,255,255,0.55)',
      textAlign: 'center',
      maxWidth: 280,
    },
    emptyHint: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    emptyHintText: {
      fontSize: 11,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.5)',
      letterSpacing: 0.2,
    },
    playerSlot: {
      ...StyleSheet.absoluteFill,
      zIndex: 1,
    },
    nowPlaying: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingTop: 2,
      paddingBottom: 14,
      borderTopWidth: 2,
      borderTopColor: colors.youtube,
      backgroundColor: '#0b0b10',
    },
    nowPlayingIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.youtube,
    },
    nowPlayingBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    videoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: -0.2,
    },
    videoChannel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.52)',
    },
    footerStrip: {
      backgroundColor: '#0b0b10',
    },
    redEdge: {
      height: 2,
      backgroundColor: colors.youtube,
    },
  });
}
