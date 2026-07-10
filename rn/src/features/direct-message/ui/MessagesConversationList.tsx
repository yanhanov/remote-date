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
import { createCommonStyles } from '@/shared/theme/styles';
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
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const header = (
    <View style={styles.header}>
      <Text style={commonStyles.eyebrow}>Social</Text>
      <Text style={commonStyles.title}>Messages</Text>
      <Text style={commonStyles.subtitle}>
        Your conversations with friends.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator color={colors.muted} />
        </View>
      </View>
    );
  }

  if (!conversations.length) {
    return (
      <View style={styles.root}>
        {header}
        <Text style={styles.empty}>
          No conversations yet. Add friends from the Friends tab to start chatting.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversationId}
        ListHeaderComponent={header}
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
    </View>
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
    root: {
      flex: 1,
      minHeight: 0,
    },
    // Match Friends / Profile / Home: padding 24, paddingTop 48
    header: {
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 8,
    },
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
      paddingHorizontal: 24,
      paddingVertical: 40,
    },
    list: {
      paddingBottom: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
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
