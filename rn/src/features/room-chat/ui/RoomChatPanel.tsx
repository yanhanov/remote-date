import { useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { Plus, PaperPlaneRight } from 'phosphor-react-native';
import type { ChatMessage } from '@/shared/api/chat.types';
import { Input } from '@/shared/ui/Input';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface RoomChatPanelProps {
  messages: ChatMessage[];
  newMessage: string;
  onChangeMessage: (value: string) => void;
  onSend: () => void;
  onSendFile?: (mode: 'image' | 'audio') => void;
  onPlayTrack?: (url: string) => void;
  currentUserName?: string | null;
  loading?: boolean;
}

function MessageSeparator() {
  return <View style={{ height: 12 }} />;
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
}: RoomChatPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.time - b.time),
    [messages],
  );

  useEffect(() => {
    if (!sorted.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [sorted]);

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
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={MessageSeparator}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
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
              </View>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <View style={styles.inputWrap}>
          <Input
            value={newMessage}
            onChangeText={onChangeMessage}
            placeholder="Message..."
            style={styles.input}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
        </View>

        <Pressable
          onPress={openAttachPicker}
          disabled={!onSendFile}
          style={({ pressed }) => [
            styles.iconBtn,
            styles.attachBtn,
            pressed && onSendFile && styles.iconBtnPressed,
            !onSendFile && styles.iconBtnDisabled,
          ]}
          accessibilityLabel="Attach file"
        >
          <Plus size={16} color={colors.secondaryForeground} />
        </Pressable>

        <Pressable
          onPress={onSend}
          style={({ pressed }) => [styles.iconBtn, styles.sendBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Send message"
        >
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

function createStyles(colors: ThemeColors) {
  const border40 = `${colors.border}66`;
  const border60 = `${colors.border}99`;

  return StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
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
      maxWidth: '88%',
    },
    rowOwn: {
      alignSelf: 'flex-end',
      alignItems: 'flex-end',
    },
    rowOther: {
      alignSelf: 'flex-start',
      alignItems: 'flex-start',
    },
    bubble: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bubbleOwn: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: colors.radius - 2,
    },
    bubbleOther: {
      backgroundColor: `${colors.background}99`,
      borderWidth: 1,
      borderColor: border60,
      borderBottomLeftRadius: colors.radius - 2,
    },
    author: {
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 4,
    },
    authorOwn: {
      color: `${colors.primaryForeground}B3`,
    },
    authorOther: {
      color: colors.muted,
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
      fontSize: 12,
      marginTop: 4,
    },
    trackOwn: {
      color: `${colors.primaryForeground}E6`,
    },
    trackOther: {
      color: colors.primary,
    },
    trackPressed: {
      opacity: 0.75,
    },
    imageWrap: {
      marginTop: 8,
      maxWidth: 200,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: border40,
      overflow: 'hidden',
    },
    image: {
      width: 200,
      maxWidth: '100%',
      minHeight: 80,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: border40,
    },
    inputWrap: {
      flex: 1,
      minWidth: 0,
    },
    input: {
      height: 36,
      borderRadius: colors.radius - 2,
      backgroundColor: `${colors.background}99`,
      borderColor: border60,
      fontSize: 14,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: colors.radius - 2,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    attachBtn: {
      backgroundColor: colors.secondary,
    },
    sendBtn: {
      backgroundColor: colors.primary,
    },
    iconBtnPressed: {
      opacity: 0.9,
    },
    iconBtnDisabled: {
      opacity: 0.5,
    },
  });
}
