import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Play, UsersThree } from 'phosphor-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface RoomPlayerCardProps {
  roomId: string;
  participants: number;
  hasContent: boolean;
  placeholder: string;
  headerAction?: ReactNode;
  children: ReactNode;
  /** Accent for empty-state icon (e.g. YouTube red) */
  accentColor?: string;
  /** Now-playing title under the header */
  contentTitle?: string | null;
}

export function RoomPlayerCard({
  roomId,
  participants,
  hasContent,
  placeholder,
  headerAction,
  children,
  accentColor,
  contentTitle,
}: RoomPlayerCardProps) {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.primary;
  const styles = useMemo(() => createStyles(colors, accent), [colors, accent]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.livePill}>
            <View style={[styles.liveDot, hasContent && styles.liveDotOn]} />
            <Text style={styles.liveText}>{hasContent ? 'Watching' : 'Waiting'}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaText} numberOfLines={1}>
              {roomId.slice(0, 8)}
            </Text>
            <View style={styles.online}>
              <UsersThree size={14} color={colors.muted} weight="bold" />
              <Text style={styles.metaText}>{participants}</Text>
            </View>
          </View>
          {contentTitle ? (
            <Text style={styles.contentTitle} numberOfLines={1}>
              {contentTitle}
            </Text>
          ) : null}
        </View>
        {headerAction}
      </View>

      <View style={styles.viewport}>
        {!hasContent ? (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Play size={28} color={accent} weight="fill" />
            </View>
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        ) : null}
        <View style={styles.playerSlot} pointerEvents={hasContent ? 'auto' : 'none'}>
          {children}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, accent: string) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 8px 28px -12px rgba(0,0,0,0.18)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 14,
            elevation: 4,
          }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    livePill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: `${accent}14`,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.muted,
    },
    liveDotOn: {
      backgroundColor: accent,
    },
    liveText: {
      fontSize: 11,
      fontWeight: '700',
      color: accent,
      letterSpacing: 0.2,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    online: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.muted,
      fontVariant: ['tabular-nums'],
    },
    contentTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.2,
    },
    viewport: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#0a0a0c',
      position: 'relative',
    },
    placeholder: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      gap: 12,
      zIndex: 0,
    },
    placeholderIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${accent}22`,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${accent}55`,
    },
    placeholderText: {
      fontSize: 14,
      color: '#ffffffaa',
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
    },
    playerSlot: {
      ...StyleSheet.absoluteFill,
      zIndex: 1,
    },
  });
}
