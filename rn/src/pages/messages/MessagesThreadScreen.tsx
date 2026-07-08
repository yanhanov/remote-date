import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import type { AppScreenProps } from '@/app/navigation/types';
import { socialAPI } from '@/shared/api/social.api';
import type { ConversationItem, DirectMessageItem } from '@/shared/api/social.types';
import { useDirectMessages } from '@/features/direct-message/model/useDirectMessages';
import { parseRoomInvite } from '@/shared/lib/room-invite-message';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

export function MessagesThreadScreen({ route, navigation }: AppScreenProps<'MessagesThread'>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = route.params.userId;
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeDisplayName, setActiveDisplayName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  const reloadConversations = useCallback(async () => {
    try {
      setConversations(await socialAPI.getConversations());
    } catch {
      // ignore
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const { sendMessage } = useDirectMessages({
    messages,
    setMessages,
    conversations,
    setConversations,
    activeUserId: userId,
    onThreadMessage: scrollToBottom,
    reloadConversations,
  });

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        const thread = await socialAPI.getThread(userId);
        setMessages(thread.messages);
        setActiveDisplayName(thread.displayName || 'Friend');
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load chat');
        setMessages([]);
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    })();
  }, [userId, scrollToBottom]);

  function handleSend() {
    const text = newMessage.trim();
    if (!text) return;
    if (!sendMessage(userId, text)) return;
    setNewMessage('');
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Pressable onPress={() => navigation.navigate('UserProfile', { id: userId })}>
        <Text style={styles.headerLink}>View {activeDisplayName}'s profile</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const invite = parseRoomInvite(item.text);
          return (
            <View style={[styles.bubbleWrap, item.isOwn ? styles.ownWrap : styles.otherWrap]}>
              <View style={[styles.bubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
                {invite ? (
                  <View>
                    <Text style={[styles.bubbleText, item.isOwn && styles.ownText]}>
                      {invite.inviterName} invited you to {invite.label}
                    </Text>
                    <Button
                      title="Join room"
                      variant="outline"
                      onPress={() =>
                        navigation.navigate(
                          invite.roomType === 'youtube' ? 'Room' : 'SoundRoom',
                          { id: invite.roomId },
                        )
                      }
                      style={styles.inviteBtn}
                    />
                  </View>
                ) : (
                  <Text style={[styles.bubbleText, item.isOwn && styles.ownText]}>{item.text}</Text>
                )}
                <Text style={[styles.time, item.isOwn && styles.ownTime]}>
                  {formatTime(item.createdAt)}
                  {item.isOwn && item.status ? ` · ${item.status}` : ''}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <Input
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Write a message..."
          style={styles.composerInput}
        />
        <Button title="Send" onPress={handleSend} style={styles.sendBtn} />
      </View>
    </KeyboardAvoidingView>
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerLink: {
      textAlign: 'center',
      padding: 12,
      color: colors.primary,
      fontSize: 13,
      fontWeight: '500',
    },
    list: {
      padding: 16,
      gap: 8,
    },
    bubbleWrap: {
      marginBottom: 8,
    },
    ownWrap: {
      alignItems: 'flex-end',
    },
    otherWrap: {
      alignItems: 'flex-start',
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    ownBubble: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    otherBubble: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    bubbleText: {
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 20,
    },
    ownText: {
      color: colors.primaryForeground,
    },
    time: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 4,
    },
    ownTime: {
      color: `${colors.primaryForeground}cc`,
    },
    inviteBtn: {
      marginTop: 8,
      height: 36,
    },
    composer: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
    composerInput: {
      flex: 1,
    },
    sendBtn: {
      width: 80,
    },
  });
}
