import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
  ActionSheetIOS,
  TextInput,
  KeyboardAvoidingView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Plus, PaperPlaneRight, ChatsCircle } from 'phosphor-react-native';
import type { ChatMessage } from '@/shared/api/chat.types';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

const HEADER_HEIGHT = 56;
const HEADER_INSET = 10;
const COMPOSER_HEIGHT = 44;
const COMPOSER_MAX_HEIGHT = 120;
const COMPOSER_INSET = 10;
const STACK_GAP = 8;
const COMPOSER_EXTRA_PAD = 8;
const BUBBLE_MAX_WIDTH = 320;
const BOTTOM_THRESHOLD = 48;
const INPUT_LINE_HEIGHT = 20;
const INPUT_VERT_PAD = COMPOSER_HEIGHT - INPUT_LINE_HEIGHT;

interface RoomChatPanelProps {
  messages: ChatMessage[];
  newMessage: string;
  onChangeMessage: (value: string) => void;
  onSend: () => void;
  onSendFile?: (mode: 'image' | 'audio') => void;
  onPlayTrack?: (url: string) => void;
  currentUserName?: string | null;
  loading?: boolean;
  /** DM-style thread; use with `sheet` for bottom-sheet insets */
  variant?: 'card' | 'thread';
  /** Compact top inset for bottom-sheet presentation */
  sheet?: boolean;
  /** Floating overlay chat (theater) — no safe-area padding, no thread header chrome */
  compact?: boolean;
  onClose?: () => void;
  /** @deprecated use variant="thread" */
  hideHeader?: boolean;
  /** @deprecated use variant="thread" */
  embedded?: boolean;
}

export function RoomChatPanel({
  messages,
  newMessage,
  onChangeMessage,
  onSend,
  onSendFile,
  onPlayTrack,
  currentUserName,
  loading,
  variant = 'card',
  sheet = false,
  compact = false,
  onClose,
  hideHeader,
  embedded,
}: RoomChatPanelProps) {
  const thread = variant === 'thread' || embedded || Boolean(onClose);

  if (thread) {
    return (
      <RoomChatThread
        messages={messages}
        newMessage={newMessage}
        onChangeMessage={onChangeMessage}
        onSend={onSend}
        onSendFile={onSendFile}
        onPlayTrack={onPlayTrack}
        currentUserName={currentUserName}
        loading={loading}
        onClose={onClose}
        hideHeader={hideHeader || compact}
        sheet={sheet}
        compact={compact}
      />
    );
  }

  return (
    <RoomChatCard
      messages={messages}
      newMessage={newMessage}
      onChangeMessage={onChangeMessage}
      onSend={onSend}
      onSendFile={onSendFile}
      onPlayTrack={onPlayTrack}
      currentUserName={currentUserName}
      loading={loading}
    />
  );
}

function RoomChatThread({
  messages,
  newMessage,
  onChangeMessage,
  onSend,
  onSendFile,
  onPlayTrack,
  currentUserName,
  loading,
  onClose,
  hideHeader,
  sheet = false,
  compact = false,
}: Omit<RoomChatPanelProps, 'variant' | 'embedded'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createThreadStyles(colors), [colors]);

  const [inputHeight, setInputHeight] = useState(COMPOSER_HEIGHT);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messageTextRef = useRef(newMessage);
  const stickToBottomRef = useRef(true);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.time - b.time),
    [messages],
  );
  const listData = useMemo(() => [...sorted].reverse(), [sorted]);

  const headerTop = compact ? 0 : sheet ? HEADER_INSET : insets.top + HEADER_INSET;
  const composerBottom = compact
    ? COMPOSER_INSET
    : COMPOSER_INSET + (sheet ? Math.max(insets.bottom, 8) : insets.bottom);
  const listPaddingTop = hideHeader
    ? STACK_GAP
    : headerTop + HEADER_HEIGHT + STACK_GAP;
  const listPaddingBottom = composerBottom + inputHeight + COMPOSER_EXTRA_PAD;

  useEffect(() => {
    messageTextRef.current = newMessage;
    if (!newMessage) setInputHeight(COMPOSER_HEIGHT);
  }, [newMessage]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    stickToBottomRef.current = event.nativeEvent.contentOffset.y <= BOTTOM_THRESHOLD;
  }

  function handleSend() {
    const text = newMessage.trim();
    if (!text) return;
    stickToBottomRef.current = true;
    onSend();
    setInputHeight(COMPOSER_HEIGHT);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      inputRef.current?.focus();
    });
  }

  function handleInputContentSizeChange(contentHeight: number, text: string) {
    const next = composerHeightFromContent(contentHeight, text.length > 0);
    setInputHeight((prev) => (prev === next ? prev : next));
  }

  function openAttachPicker() {
    if (!onSendFile) return;
    const pickImage = () => onSendFile('image');
    const pickAudio = () => onSendFile('audio');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Photo', 'Audio'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickImage();
          if (index === 2) pickAudio();
        },
      );
      return;
    }

    Alert.alert('Attach file', 'Choose file type', [
      { text: 'Photo', onPress: pickImage },
      { text: 'Audio', onPress: pickAudio },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const canSend = Boolean(newMessage.trim());

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      {!hideHeader ? (
        <View style={[styles.header, { top: headerTop }]}>
          {onClose ? (
            <Pressable
              onPress={onClose}
              hitSlop={6}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              accessibilityLabel="Close chat"
            >
              <CaretLeft size={20} color={colors.muted} weight="bold" />
            </Pressable>
          ) : null}
          <View style={styles.headerMain}>
            <View style={styles.headerIcon}>
              <ChatsCircle size={22} color={colors.primary} weight="duotone" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerName}>Room chat</Text>
              <Text style={styles.headerLink}>Watch together</Text>
            </View>
          </View>
          {onSendFile ? (
            <Pressable
              onPress={openAttachPicker}
              hitSlop={6}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              accessibilityLabel="Attach file"
            >
              <Plus size={20} color={colors.muted} weight="bold" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={(item, index) => `${item.time}-${index}`}
        inverted
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          listData.length === 0 && styles.listContentEmpty,
          { paddingTop: listPaddingBottom, paddingBottom: listPaddingTop },
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyFlip}>
              <Text style={styles.listEmpty}>No messages yet. Say hello!</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isOwn = Boolean(
            item.author && currentUserName && item.author === currentUserName,
          );

          return (
            <View style={[styles.messageRow, isOwn ? styles.rowOwn : styles.rowOther]}>
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                {!isOwn ? (
                  <Text style={styles.author} numberOfLines={1}>
                    {item.author}
                  </Text>
                ) : null}

                {item.text ? (
                  <View style={styles.messageBody}>
                    <View style={styles.messageTextWrap}>
                      <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
                        {item.text}
                      </Text>
                    </View>
                    <View style={[styles.meta, !isOwn && styles.metaOther]}>
                      <Text
                        style={[
                          styles.metaTime,
                          isOwn ? styles.metaTimeOwn : styles.metaTimeOther,
                        ]}
                      >
                        {formatTime(item.time)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {item.trackUrl ? (
                  <Pressable
                    onPress={() => onPlayTrack?.(item.trackUrl!)}
                    disabled={!onPlayTrack}
                    style={({ pressed }) => [pressed && onPlayTrack && styles.trackPressed]}
                  >
                    <Text style={[styles.track, isOwn ? styles.trackOwn : styles.trackOther]}>
                      ▶ Play track
                    </Text>
                  </Pressable>
                ) : null}

                {item.imageUrl ? (
                  <View style={styles.imageWrap}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                {!item.text ? (
                  <View style={[styles.meta, !isOwn && styles.metaOther, styles.metaSolo]}>
                    <Text
                      style={[
                        styles.metaTime,
                        isOwn ? styles.metaTimeOwn : styles.metaTimeOther,
                      ]}
                    >
                      {formatTime(item.time)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />

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
              onChangeMessage(text);
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

function RoomChatCard({
  messages,
  newMessage,
  onChangeMessage,
  onSend,
  onSendFile,
  onPlayTrack,
  currentUserName,
  loading,
}: Omit<RoomChatPanelProps, 'variant' | 'embedded' | 'hideHeader' | 'onClose'>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createCardStyles(colors), [colors]);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const stickToBottomRef = useRef(true);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.time - b.time),
    [messages],
  );

  const scrollToBottom = useCallback((animated = false) => {
    const run = () => listRef.current?.scrollToEnd({ animated });
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
  }, []);

  useEffect(() => {
    if (!sorted.length) return;
    if (stickToBottomRef.current) scrollToBottom(true);
  }, [sorted, scrollToBottom]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    stickToBottomRef.current = distance <= 80;
  }

  function handleSend() {
    stickToBottomRef.current = true;
    onSend();
    requestAnimationFrame(() => inputRef.current?.focus());
    scrollToBottom(true);
  }

  function openAttachPicker() {
    if (!onSendFile) return;
    const pickImage = () => onSendFile('image');
    const pickAudio = () => onSendFile('audio');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Photo', 'Audio'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickImage();
          if (index === 2) pickAudio();
        },
      );
      return;
    }

    Alert.alert('Attach file', 'Choose file type', [
      { text: 'Photo', onPress: pickImage },
      { text: 'Audio', onPress: pickAudio },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
      </View>

      <FlatList
        ref={listRef}
        data={sorted}
        keyExtractor={(item, index) => `${item.time}-${index}`}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (stickToBottomRef.current) {
            listRef.current?.scrollToEnd({ animated: false });
          }
        }}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No messages yet. Start the conversation!</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isOwn = Boolean(
            item.author && currentUserName && item.author === currentUserName,
          );

          return (
            <View style={[styles.messageRow, isOwn ? styles.rowOwn : styles.rowOther]}>
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                <Text style={[styles.author, isOwn ? styles.authorOwn : styles.authorOther]}>
                  {item.author}
                </Text>
                {item.text ? (
                  <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
                    {item.text}
                  </Text>
                ) : null}
                {item.trackUrl ? (
                  <Pressable
                    onPress={() => onPlayTrack?.(item.trackUrl!)}
                    disabled={!onPlayTrack}
                  >
                    <Text style={[styles.track, isOwn ? styles.trackOwn : styles.trackOther]}>
                      ▶ Play track
                    </Text>
                  </Pressable>
                ) : null}
                {item.imageUrl ? (
                  <View style={styles.imageWrap}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          ref={inputRef}
          value={newMessage}
          onChangeText={onChangeMessage}
          placeholder="Message..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable
          onPress={openAttachPicker}
          disabled={!onSendFile}
          style={[styles.iconBtn, styles.attachBtn, !onSendFile && styles.iconBtnDisabled]}
        >
          <Plus size={16} color={colors.secondaryForeground} />
        </Pressable>
        <Pressable onPress={handleSend} style={[styles.iconBtn, styles.sendBtn]}>
          <PaperPlaneRight
            size={16}
            color={colors.primaryForeground}
            weight="fill"
            style={{ transform: [{ rotate: '-30deg' }] }}
          />
        </Pressable>
      </View>
    </View>
  );
}

function formatTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function composerHeightFromContent(contentHeight: number, hasText: boolean): number {
  if (!hasText || !Number.isFinite(contentHeight) || contentHeight <= 0) {
    return COMPOSER_HEIGHT;
  }
  if (contentHeight <= INPUT_LINE_HEIGHT + 6) {
    return COMPOSER_HEIGHT;
  }
  const extraLines = Math.ceil((contentHeight - INPUT_LINE_HEIGHT) / INPUT_LINE_HEIGHT);
  return Math.min(COMPOSER_MAX_HEIGHT, COMPOSER_HEIGHT + extraLines * INPUT_LINE_HEIGHT);
}

function createThreadStyles(colors: ThemeColors) {
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
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.primary}14`,
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
      gap: 4,
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
    author: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 2,
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
    text: {
      fontSize: 15,
      lineHeight: 20,
    },
    textOwn: {
      color: colors.primaryForeground,
    },
    textOther: {
      color: colors.foreground,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
      paddingBottom: 1,
    },
    metaSolo: {
      marginTop: 4,
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
    track: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    trackOwn: {
      color: colors.primaryForeground,
    },
    trackOther: {
      color: colors.primary,
    },
    trackPressed: {
      opacity: 0.7,
    },
    imageWrap: {
      marginTop: 4,
      borderRadius: 12,
      overflow: 'hidden',
    },
    image: {
      width: 200,
      height: 140,
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
      ...(Platform.OS === 'web' ? ({ outlineWidth: 0, resize: 'none' } as const) : null),
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
  });
}

function createCardStyles(colors: ThemeColors) {
  const border40 = `${colors.border}66`;

  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: border40,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    list: {
      flex: 1,
      minHeight: 0,
    },
    listContent: {
      padding: 12,
      flexGrow: 1,
    },
    empty: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 12,
      paddingVertical: 32,
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
      maxWidth: '82%',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
    },
    bubbleOwn: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    bubbleOther: {
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    author: {
      fontSize: 11,
      fontWeight: '600',
    },
    authorOwn: {
      color: `${colors.primaryForeground}CC`,
    },
    authorOther: {
      color: colors.primary,
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
    },
    textOwn: {
      color: colors.primaryForeground,
    },
    textOther: {
      color: colors.foreground,
    },
    track: {
      fontSize: 13,
      fontWeight: '600',
    },
    trackOwn: {
      color: colors.primaryForeground,
    },
    trackOther: {
      color: colors.primary,
    },
    imageWrap: {
      borderRadius: 10,
      overflow: 'hidden',
    },
    image: {
      width: 180,
      height: 120,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: border40,
    },
    input: {
      flex: 1,
      height: 40,
      borderRadius: 20,
      paddingHorizontal: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.background,
      fontSize: 14,
      color: colors.foreground,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachBtn: {
      backgroundColor: colors.secondary,
    },
    sendBtn: {
      backgroundColor: colors.primary,
    },
    iconBtnDisabled: {
      opacity: 0.4,
    },
  });
}
