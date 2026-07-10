import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  ChatCircle,
  LinkSimple,
  UserPlus,
  X,
} from 'phosphor-react-native';
import type { AppScreenProps } from '@/app/navigation/types';
import { useRoom } from '@/entities/room/model/useRoom';
import { useRoomScreenLifecycle } from '@/entities/room/model/useRoomScreenLifecycle';
import { RoomNotFound } from '@/entities/room/ui/RoomNotFound';
import {
  RoomInviteButton,
  RoomPanelCard,
  RoomScreenLayout,
} from '@/entities/room/ui/RoomScreenLayout';
import { RoomPlayerCard } from '@/entities/room/ui/RoomPlayerCard';
import { useChat } from '@/features/room-chat/model/useChat';
import { RoomChatPanel } from '@/features/room-chat/ui/RoomChatPanel';
import {
  BeletPlayer,
  changeRoomBelet,
  type BeletPlayerHandle,
} from '@/features/room-player/ui/BeletPlayer';
import { RoomInviteModal } from '@/features/room-share/ui/RoomInviteModal';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { isBeletUrl, normalizeBeletUrl } from '@/shared/lib/belet-url';
import { socketService } from '@/shared/api/socket.service';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

export function BeletRoomScreen({ route, navigation }: AppScreenProps<'BeletRoom'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.top, insets.bottom),
    [colors, insets.top, insets.bottom],
  );
  const playerRef = useRef<BeletPlayerHandle>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [beletLink, setBeletLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const leaveRoom = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBack = useCallback(() => {
    if (chatOpen) {
      setChatOpen(false);
      return true;
    }
    if (linkOpen) {
      setLinkOpen(false);
      return true;
    }
    if (inviteOpen) {
      setInviteOpen(false);
      return true;
    }
    if (playerRef.current?.goBack()) {
      return true;
    }
    leaveRoom();
    return true;
  }, [chatOpen, linkOpen, inviteOpen, leaveRoom]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  const roomId = route.params.id;
  const {
    room,
    setRoom,
    loading,
    error,
    setError,
    participants,
    loadedAt,
    load,
    join,
    leave,
  } = useRoom(roomId);

  const { messages, newMessage, setNewMessage, send, sendFile, currentUserName } =
    useChat(roomId);

  useRoomScreenLifecycle(roomId, navigation, { load, join, leave, setError });

  useEffect(() => {
    if (room && room.type !== 'belet') {
      setError('This is not a Belet room');
    }
  }, [room, setError]);

  useEffect(() => {
    if (room?.beletUrl) {
      setBeletLink(room.beletUrl);
    }
  }, [room?.beletUrl]);

  useEffect(() => {
    const onBeletChange = (data: { beletUrl: string; title?: string }) => {
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              beletUrl: data.beletUrl,
              beletTitle: data.title ?? prev.beletTitle,
            }
          : prev,
      );
      setBeletLink(data.beletUrl);
    };

    socketService.on('belet:change', onBeletChange);
    return () => socketService.off('belet:change', onBeletChange);
  }, [setRoom]);

  async function submitBeletUrl() {
    const trimmed = beletLink.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Paste a Belet content link');
      return;
    }
    if (!isBeletUrl(trimmed)) {
      Alert.alert('Error', 'Use a link from belet.tm or film.belet.com.tm');
      return;
    }

    const normalized = normalizeBeletUrl(trimmed);
    setSubmitting(true);
    try {
      changeRoomBelet(roomId, { beletUrl: normalized });
      if (room) {
        setRoom({
          ...room,
          beletUrl: normalized,
        });
      }
      setLinkOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  if (error || !room) {
    return (
      <RoomNotFound
        roomId={roomId}
        roomType="belet"
        error={error ?? 'Room not found'}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  const hasContent = Boolean(room.beletUrl);
  const isNative = Platform.OS !== 'web';

  if (isNative) {
    return (
      <View style={styles.fullscreen}>
        <View style={styles.playerFill}>
          <BeletPlayer ref={playerRef} roomId={roomId} room={room} loadedAt={loadedAt} />
        </View>

        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.topBarInner}>
            <Pressable
              onPress={handleBack}
              onLongPress={leaveRoom}
              delayLongPress={450}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              accessibilityLabel="Go back"
              accessibilityHint="Long press to leave the room"
            >
              <CaretLeft size={22} color="#fff" weight="bold" />
            </Pressable>

            <View style={styles.topMeta}>
              <Text style={styles.topMetaText} numberOfLines={1}>
                Room {room.id.slice(0, 8)} · {participants} online
              </Text>
            </View>

            <Pressable
              onPress={() => setChatOpen(true)}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              accessibilityLabel="Open chat"
            >
              <ChatCircle size={20} color="#fff" weight="bold" />
            </Pressable>
            <Pressable
              onPress={() => setLinkOpen(true)}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              accessibilityLabel="Set Belet link"
            >
              <LinkSimple size={20} color="#fff" weight="bold" />
            </Pressable>
            <Pressable
              onPress={() => setInviteOpen(true)}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              accessibilityLabel="Invite participant"
            >
              <UserPlus size={20} color="#fff" weight="bold" />
            </Pressable>
          </View>
        </View>

        <Modal
          visible={linkOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setLinkOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.sheetRoot}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setLinkOpen(false)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderText}>
                  <Text style={styles.sheetTitle}>Share Belet content</Text>
                  <Text style={styles.sheetDescription}>
                    Paste a film or episode link. Everyone opens it with their own account.
                  </Text>
                </View>
                <Pressable onPress={() => setLinkOpen(false)} hitSlop={8}>
                  <X size={20} color={colors.muted} />
                </Pressable>
              </View>
              <Input
                value={beletLink}
                onChangeText={setBeletLink}
                placeholder="https://belet.tm/..."
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.urlInput}
              />
              <Button
                title={submitting ? 'Updating...' : 'Set for room'}
                loading={submitting}
                onPress={() => void submitBeletUrl()}
                style={styles.urlBtn}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={chatOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setChatOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.sheetRoot}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setChatOpen(false)} />
            <View style={styles.chatSheet}>
              <View style={[styles.sheetHeader, styles.chatSheetHeader]}>
                <Text style={styles.sheetTitle}>Room chat</Text>
                <Pressable onPress={() => setChatOpen(false)} hitSlop={8}>
                  <X size={20} color={colors.muted} />
                </Pressable>
              </View>
              <View style={styles.chatBody}>
                <RoomChatPanel
                  messages={messages}
                  newMessage={newMessage}
                  onChangeMessage={setNewMessage}
                  onSend={send}
                  onSendFile={(mode) => void sendFile(mode)}
                  currentUserName={currentUserName}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <RoomInviteModal
          visible={inviteOpen}
          roomId={roomId}
          roomType="belet"
          onClose={() => setInviteOpen(false)}
        />
      </View>
    );
  }

  return (
    <RoomScreenLayout
      main={
        <>
          <RoomPanelCard
            title="Share Belet content"
            description="Paste a film or episode link. Everyone opens it with their own account."
          >
            <View style={styles.urlForm}>
              <Input
                value={beletLink}
                onChangeText={setBeletLink}
                placeholder="https://belet.tm/..."
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.urlInput}
              />
              <Button
                title={submitting ? 'Updating...' : 'Set for room'}
                loading={submitting}
                onPress={() => void submitBeletUrl()}
                style={styles.urlBtn}
              />
            </View>
          </RoomPanelCard>

          <RoomPlayerCard
            roomId={room.id}
            participants={participants}
            hasContent={hasContent}
            placeholder="Set a Belet link to start watching together."
            headerAction={<RoomInviteButton onPress={() => setInviteOpen(true)} />}
          >
            <BeletPlayer roomId={roomId} room={room} loadedAt={loadedAt} />
          </RoomPlayerCard>
        </>
      }
      chat={
        <RoomChatPanel
          messages={messages}
          newMessage={newMessage}
          onChangeMessage={setNewMessage}
          onSend={send}
          onSendFile={(mode) => void sendFile(mode)}
          currentUserName={currentUserName}
        />
      }
      footer={
        <RoomInviteModal
          visible={inviteOpen}
          roomId={roomId}
          roomType="belet"
          onClose={() => setInviteOpen(false)}
        />
      }
    />
  );
}

function createStyles(colors: ThemeColors, topInset: number, bottomInset: number) {
  return StyleSheet.create({
    fullscreen: {
      flex: 1,
      backgroundColor: '#000',
    },
    playerFill: {
      ...StyleSheet.absoluteFill,
    },
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: topInset,
      zIndex: 10,
    },
    topBarInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    topMeta: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 4,
    },
    topMetaText: {
      color: '#ffffffcc',
      fontSize: 12,
      fontWeight: '600',
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    iconBtnPressed: {
      opacity: 0.7,
    },
    sheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: Math.max(bottomInset, 16) + 8,
      gap: 12,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    chatSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 16,
      paddingBottom: Math.max(bottomInset, 8),
      height: '78%',
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    chatSheetHeader: {
      paddingHorizontal: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 8,
    },
    sheetHeaderText: {
      flex: 1,
      gap: 4,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
    },
    sheetDescription: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
    },
    chatBody: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: 8,
    },
    urlForm: {
      gap: 10,
    },
    urlInput: {
      backgroundColor: `${colors.background}99`,
      borderColor: `${colors.border}99`,
    },
    urlBtn: {
      backgroundColor: colors.belet,
    },
  });
}
