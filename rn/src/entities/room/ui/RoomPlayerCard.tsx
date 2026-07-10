import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface RoomPlayerCardProps {
  roomId: string;
  participants: number;
  hasContent: boolean;
  placeholder: string;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function RoomPlayerCard({
  roomId,
  participants,
  hasContent,
  placeholder,
  headerAction,
  children,
}: RoomPlayerCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.meta}>
          <Text style={styles.metaText}>Room {roomId.slice(0, 8)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{participants} online</Text>
        </View>
        {headerAction}
      </View>

      <View style={styles.content}>
        <View style={styles.viewport}>
          {!hasContent ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>{placeholder}</Text>
            </View>
          ) : null}
          <View style={styles.playerSlot}>{children}</View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 200,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}66`,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.muted,
    },
    metaDot: {
      fontSize: 12,
      color: colors.muted,
    },
    content: {
      flex: 1,
      padding: 12,
      minHeight: 0,
    },
    viewport: {
      flex: 1,
      minHeight: 180,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#000',
      position: 'relative',
    },
    placeholder: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      zIndex: 0,
    },
    placeholderText: {
      fontSize: 14,
      color: '#ffffff99',
      textAlign: 'center',
      lineHeight: 20,
    },
    playerSlot: {
      ...StyleSheet.absoluteFill,
      zIndex: 1,
    },
  });
}
