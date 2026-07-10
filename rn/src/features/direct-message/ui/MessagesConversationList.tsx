import { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { ConversationItem } from '@/shared/api/social.types';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface MessagesConversationListProps {
  conversations: ConversationItem[];
  activeUserId?: string | null;
  isLoading: boolean;
  onSelect: (userId: string) => void;
}

export function MessagesConversationList({
  conversations,
  activeUserId,
  isLoading,
  onSelect,
}: MessagesConversationListProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  if (!conversations.length) {
    return (
      <Text style={styles.empty}>
        No conversations yet. Add friends from the Friends tab to start chatting.
      </Text>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.conversationId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const isActive = activeUserId === item.userId;
        return (
          <Pressable
            onPress={() => onSelect(item.userId)}
            style={({ pressed }) => [
              styles.row,
              isActive && styles.rowActive,
              pressed && !isActive && styles.rowPressed,
            ]}
          >
            <UserAvatar user={item} size="md" />
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.displayName}
                </Text>
                {item.lastMessageAt ? (
                  <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
                ) : null}
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessageText || 'No messages yet'}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    empty: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      paddingHorizontal: 16,
      paddingVertical: 40,
    },
    list: {
      paddingVertical: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    rowActive: {
      backgroundColor: `${colors.primary}1A`,
    },
    rowPressed: {
      backgroundColor: `${colors.accent}66`,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
    },
    name: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.foreground,
      lineHeight: 18,
    },
    time: {
      fontSize: 12,
      color: colors.muted,
      flexShrink: 0,
    },
    preview: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 2,
    },
  });
}
