import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  TextInput,
  LayoutAnimation,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
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
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import { useResponsive } from '@/shared/lib/use-responsive';

const HEADER_HEIGHT = 56;
const HEADER_INSET = 10;
const COMPOSER_HEIGHT = 44;
const COMPOSER_MAX_HEIGHT = 120;
const COMPOSER_INSET = 10;
const STACK_GAP = 8;
/** Gap between last bubble and floating composer */
const COMPOSER_EXTRA_PAD = 8;
const BUBBLE_MAX_WIDTH = 320;
const BOTTOM_THRESHOLD = 48;
const INPUT_LINE_HEIGHT = 20;
/** Total vertical padding so one line + pad === COMPOSER_HEIGHT */
const INPUT_VERT_PAD = COMPOSER_HEIGHT - INPUT_LINE_HEIGHT;

const MESSAGE_LAYOUT_ANIM = LayoutAnimation.create(
  220,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

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
  const { isWide } = useResponsive();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeDisplayName, setActiveDisplayName] = useState('');
  const [activeAvatarUrl, setActiveAvatarUrl] = useState<string | undefined>();
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputHeight, setInputHeight] = useState(COMPOSER_HEIGHT);

  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<DirectMessageItem>>(null);
  const messageTextRef = useRef('');
  // Inverted list: offset ~0 means visual bottom (latest messages).
  const stickToBottomRef = useRef(true);

  // Newest-first so inverted FlatList opens on the latest message with no scroll.
  const listData = useMemo(() => [...messages].reverse(), [messages]);

  const headerTop = insets.top + HEADER_INSET;
  // Mobile nav already owns the bottom safe-area inset; don't double-pad over it.
  const composerBottom = COMPOSER_INSET + (isWide ? insets.bottom : 0);
  const listPaddingTop = headerTop + HEADER_HEIGHT + STACK_GAP;
  const listPaddingBottom = composerBottom + inputHeight + COMPOSER_EXTRA_PAD;

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setActiveDisplayName('');
      setActiveAvatarUrl(undefined);
      setNewMessage('');
      messageTextRef.current = '';
      setInputHeight(COMPOSER_HEIGHT);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    stickToBottomRef.current = true;
    setNewMessage('');
    messageTextRef.current = '';
    setInputHeight(COMPOSER_HEIGHT);

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
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, setMessages]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    // Inverted: y≈0 is the latest messages (visual bottom).
    stickToBottomRef.current = event.nativeEvent.contentOffset.y <= BOTTOM_THRESHOLD;
  }

  function focusComposer() {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function scrollToLatest(animated = false) {
    listRef.current?.scrollToOffset({ offset: 0, animated });
  }

  function handleSend() {
    const text = newMessage.trim();
    if (!text || !userId) return;

    stickToBottomRef.current = true;
    LayoutAnimation.configureNext(MESSAGE_LAYOUT_ANIM);

    if (!onSend(text)) return;

    messageTextRef.current = '';
    setNewMessage('');
    setInputHeight(COMPOSER_HEIGHT);
    requestAnimationFrame(() => scrollToLatest(false));
    focusComposer();
  }

  function handleInputContentSizeChange(contentHeight: number, text: string) {
    const next = composerHeightFromContent(contentHeight, text.length > 0);
    setInputHeight((prev) => (prev === next ? prev : next));
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
          data={listData}
          keyExtractor={(item) => item.id}
          inverted
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            listData.length === 0 && styles.listContentEmpty,
            // inverted flips paddings: top = visual bottom (composer), bottom = visual top (header)
            { paddingTop: listPaddingBottom, paddingBottom: listPaddingTop },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListEmptyComponent={
            <View style={styles.emptyFlip}>
              <Text style={styles.listEmpty}>No messages yet. Say hello!</Text>
            </View>
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

      <View style={[styles.composer, { bottom: composerBottom }]} pointerEvents="box-none">
        <View
          style={[
            styles.composerField,
            { height: inputHeight },
            inputHeight > COMPOSER_HEIGHT && styles.composerFieldMultiline,
          ]}
        >
          <TextInput
            ref={inputRef}
            value={newMessage}
            onChangeText={(text) => {
              messageTextRef.current = text;
              setNewMessage(text);
              if (!text) setInputHeight(COMPOSER_HEIGHT);
            }}
            placeholder="Write a message..."
            placeholderTextColor={colors.muted}
            style={styles.composerInput}
            multiline
            scrollEnabled={inputHeight >= COMPOSER_MAX_HEIGHT}
            textAlignVertical={inputHeight > COMPOSER_HEIGHT ? 'top' : 'center'}
            blurOnSubmit={false}
            returnKeyType="default"
            underlineColorAndroid="transparent"
            {...(Platform.OS === 'android' ? { includeFontPadding: false } : null)}
            onContentSizeChange={(event) => {
              handleInputContentSizeChange(
                event.nativeEvent.contentSize.height,
                messageTextRef.current,
              );
            }}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          onPressIn={() => {
            if (canSend) stickToBottomRef.current = true;
          }}
          style={({ pressed }) => [
            styles.sendBtn,
            canSend ? styles.sendBtnActive : styles.sendBtnIdle,
            pressed && canSend && styles.sendBtnPressed,
          ]}
          accessibilityLabel="Send message"
        >
          <PaperPlaneRight
            size={20}
            color={canSend ? colors.primaryForeground : colors.muted}
            weight="fill"
            style={styles.sendIcon}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/** Keep empty/single-line at COMPOSER_HEIGHT so it matches the send button. */
function composerHeightFromContent(contentHeight: number, hasText: boolean): number {
  if (!hasText || !Number.isFinite(contentHeight) || contentHeight <= 0) {
    return COMPOSER_HEIGHT;
  }

  // contentSize sometimes reports the full padded frame (~44); ignore that as "one line".
  if (contentHeight <= INPUT_LINE_HEIGHT + 6) {
    return COMPOSER_HEIGHT;
  }

  const extraLines = Math.ceil((contentHeight - INPUT_LINE_HEIGHT) / INPUT_LINE_HEIGHT);
  return Math.min(COMPOSER_MAX_HEIGHT, COMPOSER_HEIGHT + extraLines * INPUT_LINE_HEIGHT);
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
    listContentEmpty: {
      justifyContent: 'center',
    },
    emptyFlip: {
      transform: [{ scaleY: -1 }],
    },
    listEmpty: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 14,
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
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    composerField: {
      flex: 1,
      minWidth: 0,
      height: COMPOSER_HEIGHT,
      maxHeight: COMPOSER_MAX_HEIGHT,
      borderRadius: COMPOSER_HEIGHT / 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      justifyContent: 'center',
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 4px 16px -8px rgba(0,0,0,0.1)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }),
    },
    composerFieldMultiline: {
      justifyContent: 'flex-start',
      paddingVertical: INPUT_VERT_PAD / 2,
    },
    composerInput: {
      width: '100%',
      paddingHorizontal: 16,
      paddingVertical: 0,
      fontSize: 15,
      lineHeight: INPUT_LINE_HEIGHT,
      color: colors.foreground,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const, resize: 'none' as const } : null),
    },
    sendBtn: {
      width: COMPOSER_HEIGHT,
      height: COMPOSER_HEIGHT,
      borderRadius: COMPOSER_HEIGHT / 2,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    sendBtnActive: {
      borderColor: 'transparent',
      backgroundColor: colors.primary,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          }
        : { elevation: 3 }),
    },
    sendBtnIdle: {
      borderColor: colors.border,
      backgroundColor: colors.card,
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
