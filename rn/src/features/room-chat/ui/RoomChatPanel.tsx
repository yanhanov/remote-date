import { useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Plus, PaperPlaneRight, Image as ImageIcon } from 'phosphor-react-native';
import type { ChatMessage } from '@/shared/api/chat.types';
import { Input } from '@/shared/ui/Input';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface RoomChatPanelProps {
  messages: ChatMessage[];
  newMessage: string;
  onChangeMessage: (value: string) => void;
  onSend: () => void;
  onSendImage: () => void;
  onSendAudio: () => void;
  currentUserName?: string | null;
}

export function RoomChatPanel({
  messages,
  newMessage,
  onChangeMessage,
  onSend,
  onSendImage,
  onSendAudio,
  currentUserName,
}: RoomChatPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const listRef = useRef<FlatList>(null);
  const sorted = [...messages].sort((a, b) => a.time - b.time);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Chat</Text>

      <FlatList
        ref={listRef}
        data={sorted}
        keyExtractor={(item, index) => `${item.time}-${index}`}
        style={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Start the conversation!</Text>}
        renderItem={({ item }) => {
          const isOwn = Boolean(item.author && currentUserName && item.author === currentUserName);
          return (
            <View style={[styles.message, isOwn ? styles.own : styles.other]}>
              <Text style={[styles.author, isOwn && styles.ownAuthor]}>{item.author}</Text>
              {item.text ? (
                <Text style={[styles.text, isOwn && styles.ownText]}>{item.text}</Text>
              ) : null}
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : null}
              {item.trackUrl ? (
                <Text style={[styles.track, isOwn && styles.ownText]}>▶ Audio attachment</Text>
              ) : null}
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <Input
          value={newMessage}
          onChangeText={onChangeMessage}
          placeholder="Message..."
          style={styles.input}
        />
        <Pressable onPress={onSendImage} style={styles.attachBtn}>
          <ImageIcon size={18} color={colors.muted} weight="bold" />
        </Pressable>
        <Pressable onPress={onSendAudio} style={styles.attachBtn}>
          <Plus size={18} color={colors.muted} weight="bold" />
        </Pressable>
        <Pressable onPress={onSend} style={styles.sendBtn}>
          <PaperPlaneRight size={18} color={colors.primaryForeground} weight="fill" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      color: colors.foreground,
    },
    list: {
      flex: 1,
      padding: 12,
    },
    empty: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 12,
      paddingVertical: 24,
    },
    message: {
      maxWidth: '88%',
      borderRadius: 16,
      padding: 10,
      marginBottom: 8,
    },
    own: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    other: {
      alignSelf: 'flex-start',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    author: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 4,
    },
    ownAuthor: {
      color: `${colors.primaryForeground}aa`,
    },
    text: {
      fontSize: 14,
      color: colors.foreground,
    },
    ownText: {
      color: colors.primaryForeground,
    },
    image: {
      width: 180,
      height: 120,
      borderRadius: 8,
      marginTop: 6,
    },
    track: {
      fontSize: 12,
      marginTop: 4,
      color: colors.primary,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      height: 40,
    },
    attachBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.mutedBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
