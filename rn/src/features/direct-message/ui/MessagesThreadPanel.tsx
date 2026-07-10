import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, ChatsCircle, PaperPlaneRight } from 'phosphor-react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { AppStackParamList } from '@/app/navigation/types';
import { socialAPI } from '@/shared/api/social.api';
import type { DirectMessageItem } from '@/shared/api/social.types';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import { DirectMessageContent } from '@/features/direct-message/ui/DirectMessageContent';
import { MessageStatusIcon } from '@/features/direct-message/ui/MessageStatusIcon';
import { parseRoomInvite } from '@/shared/lib/room-invite-message';
import { Input } from '@/shared/ui/Input';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

const HEADER_HEIGHT = 56;
const HEADER_INSET = 10;
const COMPOSER_HEIGHT = 48;
const COMPOSER_INSET = 10;
const STACK_GAP = 8;
const BUBBLE_MAX_WIDTH = 320;

interface MessagesThreadPanelProps {
  userId: string | null;
  navigation: NavigationProp<AppStackParamList>;
  messages: DirectMessageItem[];
  setMessages: React.Dispatch<React.SetStateAction<DirectMessageItem[]>>;
  onSend: (text: string) => boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function MessagesThreadPanel({
  userId,
  navigation,
  messages,
  setMessages,
  onSend,
  showBackButton,
  onBack,
}: MessagesThreadPanelProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeDisplayName, setActiveDisplayName] = useState('');
  const [activeAvatarUrl, setActiveAvatarUrl] = useState<string | undefined>();
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList<DirectMessageItem>>(null);

  // MobileNav is hidden on MessagesThread — sit above home indicator like Vue desktop.
  const headerTop = insets.top + HEADER_INSET;
  const composerBottom = COMPOSER_INSET + insets.bottom;
  const listPaddingTop = headerTop + HEADER_HEIGHT + STACK_GAP;
  const listPaddingBottom = composerBottom + COMPOSER_HEIGHT + STACK_GAP;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setActiveDisplayName('');
      setActiveAvatarUrl(undefined);
      setNewMessage('');
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      try {
        const thread = await socialAPI.getThread(userId);
        if (cancelled) return;
        setMessages(thread.messages);
        setActiveDisplayName(thread.displayName || 'Friend');
        setActiveAvatarUrl(thread.avatarUrl);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          scrollToBottom();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, setMessages, scrollToBottom]);

  useEffect(() => {
    if (messages.length) scrollToBottom();
  }, [messages, scrollToBottom]);

  function handleSend() {
    const text = newMessage.trim();
    if (!text || !userId) return;
    if (!onSend(text)) return;
    setNewMessage('');
  }

  if (!userId) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <ChatsCircle size={32} color={colors.primary} weight="duotone" />
        </View>
        <Text style={styles.emptyTitle}>Select a chat</Text>
        <Text style={styles.emptySubtitle}>
          Choose a conversation or start messaging from a friend&apos;s profile.
        </Text>
      </View>
    );
  }

  const canSend = Boolean(newMessage.trim());

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      {/* Floating pill header — mirrors Vue messages-page__thread-header */}
      <View style={[styles.header, { top: headerTop }]}>
        {showBackButton ? (
          <Pressable
            onPress={onBack}
            hitSlop={6}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityLabel="Back to chats"
          >
            <CaretLeft size={20} color={colors.muted} weight="bold" />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate('UserProfile', { id: userId })}
          style={styles.headerMain}
        >
          <UserAvatar
            user={{
              userId,
              displayName: activeDisplayName,
              avatarUrl: activeAvatarUrl,
            }}
            size="sm"
          />
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {activeDisplayName}
            </Text>
            <Text style={styles.headerLink}>View profile</Text>
          </View>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: listPaddingTop, paddingBottom: listPaddingBottom },
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.listEmpty}>No messages yet. Say hello!</Text>
          }
          renderItem={({ item }) => {
            const isInvite = Boolean(parseRoomInvite(item.text));

            return (
              <View style={[styles.messageRow, item.isOwn ? styles.rowOwn : styles.rowOther]}>
                <View
                  style={[
                    isInvite ? styles.inviteBubble : styles.bubble,
                    !isInvite && (item.isOwn ? styles.bubbleOwn : styles.bubbleOther),
                  ]}
                >
                  {isInvite ? (
                    <DirectMessageContent
                      text={item.text}
                      isOwn={item.isOwn}
                      createdAt={item.createdAt}
                      navigation={navigation}
                    />
                  ) : (
                    <View style={styles.messageBody}>
                      <View style={styles.messageTextWrap}>
                        <DirectMessageContent
                          text={item.text}
                          isOwn={item.isOwn}
                          navigation={navigation}
                        />
                      </View>
                      <View style={[styles.meta, !item.isOwn && styles.metaOther]}>
                        <Text
                          style={[
                            styles.metaTime,
                            item.isOwn ? styles.metaTimeOwn : styles.metaTimeOther,
                          ]}
                        >
                          {formatTime(item.createdAt)}
                        </Text>
                        {item.isOwn ? <MessageStatusIcon status={item.status} /> : null}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Floating composer */}
      <View style={[styles.composer, { bottom: composerBottom }]}>
        <View style={styles.composerBar}>
          <Input
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Write a message..."
            style={styles.composerInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendBtn,
              canSend ? styles.sendBtnActive : styles.sendBtnIdle,
              pressed && canSend && styles.sendBtnPressed,
            ]}
            accessibilityLabel="Send message"
          >
            <PaperPlaneRight
              size={18}
              color={canSend ? colors.primaryForeground : colors.muted}
              weight="fill"
              style={styles.sendIcon}
            />
          </Pressable>
        </View>
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
    root: {
      flex: 1,
      minHeight: 0,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    header: {
      position: 'absolute',
      left: HEADER_INSET,
      right: HEADER_INSET,
      zIndex: 20,
      height: HEADER_HEIGHT,
      borderRadius: 30,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.border}66`,
      backgroundColor: Platform.OS === 'ios' ? `${colors.card}F2` : colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 8,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 3,
          }),
    },
    headerMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      paddingRight: 4,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnPressed: {
      backgroundColor: `${colors.accent}99`,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    headerName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.2,
    },
    headerLink: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 1,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: HEADER_INSET,
      gap: 8,
      flexGrow: 1,
    },
    listEmpty: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 14,
      marginTop: 48,
    },
    messageRow: {
      flexDirection: 'row',
    },
    rowOwn: {
      justifyContent: 'flex-end',
    },
    rowOther: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: BUBBLE_MAX_WIDTH,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    bubbleOwn: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 6,
    },
    bubbleOther: {
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderBottomLeftRadius: 6,
    },
    inviteBubble: {
      width: '100%',
      maxWidth: 352,
    },
    messageBody: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      gap: 8,
    },
    messageTextWrap: {
      flexShrink: 1,
      minWidth: 0,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
      paddingBottom: 1,
    },
    metaOther: {
      opacity: 0.6,
    },
    metaTime: {
      fontSize: 10,
      fontWeight: '500',
      fontVariant: ['tabular-nums'],
    },
    metaTimeOwn: {
      color: colors.primaryForeground,
    },
    metaTimeOther: {
      color: colors.muted,
    },
    composer: {
      position: 'absolute',
      left: COMPOSER_INSET,
      right: COMPOSER_INSET,
      zIndex: 20,
    },
    composerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: COMPOSER_HEIGHT,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      borderRadius: 26,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 4px 20px -8px rgba(0,0,0,0.12)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 3,
          }),
    },
    composerInput: {
      flex: 1,
      minWidth: 0,
      height: 36,
      borderWidth: 0,
      borderRadius: 0,
      backgroundColor: 'transparent',
      paddingHorizontal: 0,
      fontSize: 15,
      ...(Platform.OS === 'web'
        ? { boxShadow: 'none', outlineStyle: 'none' as const }
        : {
            shadowOpacity: 0,
            elevation: 0,
          }),
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnActive: {
      backgroundColor: colors.primary,
    },
    sendBtnIdle: {
      backgroundColor: colors.mutedBg,
    },
    sendBtnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.94 }],
    },
    sendIcon: {
      transform: [{ rotate: '-30deg' }],
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
      backgroundColor: colors.background,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: `${colors.primary}14`,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.primary}33`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.2,
    },
    emptySubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
      textAlign: 'center',
      maxWidth: 280,
    },
  });
}
