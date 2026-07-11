import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Platform,
  Pressable,
  PanResponder,
  KeyboardAvoidingView,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatCircle } from 'phosphor-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import { useResponsive } from '@/shared/lib/use-responsive';
import type { ChatMessage } from '@/shared/api/chat.types';
import { RoomChatPanel } from '@/features/room-chat/ui/RoomChatPanel';

const FAB_SIZE = 56;
const FAB_MARGIN = 16;
const FAB_POS_KEY = 'room-floating-chat-fab-pos-v3';
const DRAG_THRESHOLD = 8;
const SHEET_HEIGHT = '72%';

interface FabPos {
  x: number;
  y: number;
}

interface RoomFloatingChatProps {
  messages: ChatMessage[];
  newMessage: string;
  onChangeMessage: (value: string) => void;
  onSend: () => void;
  onSendFile?: (mode: 'image' | 'audio') => void;
  onPlayTrack?: (url: string) => void;
  currentUserName?: string | null;
  messageCount?: number;
}

export function RoomFloatingChat({
  messages,
  newMessage,
  onChangeMessage,
  onSend,
  onSendFile,
  onPlayTrack,
  currentUserName,
  messageCount = 0,
}: RoomFloatingChatProps) {
  const { colors } = useTheme();
  const { isWide } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide), [colors, isWide]);

  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(messageCount);
  /** null = default bottom-right via right/bottom styles */
  const [pos, setPos] = useState<FabPos | null>(null);
  const [bounds, setBounds] = useState({ w: 0, h: 0 });

  const posRef = useRef<FabPos | null>(null);
  const dragOrigin = useRef<FabPos>({ x: 0, y: 0 });
  const dragged = useRef(false);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAB_POS_KEY);
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as FabPos;
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          setPos(parsed);
        }
      } catch {
        // ignore — keep default bottom-right
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (open) setSeenCount(messageCount);
  }, [open, messageCount]);

  const unread = open ? 0 : Math.max(0, messageCount - seenCount);

  const clampPos = useCallback((next: FabPos, w: number, h: number): FabPos => {
    if (w <= 0 || h <= 0) return next;
    const minX = FAB_MARGIN;
    const minY = FAB_MARGIN;
    const maxX = Math.max(minX, w - FAB_SIZE - FAB_MARGIN);
    const maxY = Math.max(minY, h - FAB_SIZE - FAB_MARGIN);
    return {
      x: Math.min(maxX, Math.max(minX, next.x)),
      y: Math.min(maxY, Math.max(minY, next.y)),
    };
  }, []);

  const defaultPosInBounds = useCallback(
    (w: number, h: number): FabPos =>
      clampPos(
        {
          x: w - FAB_SIZE - FAB_MARGIN,
          y: h - FAB_SIZE - FAB_MARGIN,
        },
        w,
        h,
      ),
    [clampPos],
  );

  const persistPos = useCallback((next: FabPos) => {
    setPos(next);
    posRef.current = next;
    void AsyncStorage.setItem(FAB_POS_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const openChat = useCallback(() => {
    setSeenCount(messageCount);
    setOpen(true);
  }, [messageCount]);

  const closeChat = useCallback(() => setOpen(false), []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (
          _e: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD,
        onPanResponderGrant: () => {
          dragged.current = false;
          const { w, h } = boundsRef.current;
          dragOrigin.current =
            posRef.current ?? defaultPosInBounds(w || 320, h || 480);
        },
        onPanResponderMove: (_e, gesture) => {
          if (
            Math.abs(gesture.dx) > DRAG_THRESHOLD ||
            Math.abs(gesture.dy) > DRAG_THRESHOLD
          ) {
            dragged.current = true;
          }
          const { w, h } = boundsRef.current;
          const next = clampPos(
            {
              x: dragOrigin.current.x + gesture.dx,
              y: dragOrigin.current.y + gesture.dy,
            },
            w,
            h,
          );
          posRef.current = next;
          setPos(next);
        },
        onPanResponderRelease: () => {
          if (!dragged.current) return;
          if (posRef.current) persistPos(posRef.current);
        },
        onPanResponderTerminate: () => {
          if (dragged.current && posRef.current) persistPos(posRef.current);
        },
      }),
    [clampPos, defaultPosInBounds, persistPos],
  );

  function handleOverlayLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width === bounds.w && height === bounds.h) return;
    setBounds({ w: width, h: height });
    if (posRef.current) {
      const next = clampPos(posRef.current, width, height);
      posRef.current = next;
      setPos(next);
    }
  }

  const fabStyle =
    pos != null
      ? { left: pos.x, top: pos.y, right: undefined, bottom: undefined }
      : { right: FAB_MARGIN, bottom: FAB_MARGIN, left: undefined, top: undefined };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Layout probe must not steal touches from the room UI underneath */}
      <View
        style={styles.layoutProbe}
        pointerEvents="none"
        onLayout={handleOverlayLayout}
      />

      {!open ? (
        <View
          {...panResponder.panHandlers}
          pointerEvents="auto"
          style={[styles.fabWrap, fabStyle]}
          collapsable={false}
        >
          <Pressable
            onPress={openChat}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            accessibilityLabel="Open room chat"
            accessibilityRole="button"
          >
            <ChatCircle size={24} color={colors.primaryForeground} weight="fill" />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeChat}>
        <KeyboardAvoidingView
          style={styles.sheetRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={closeChat}
            accessibilityLabel="Close chat"
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetBody}>
              <RoomChatPanel
                messages={messages}
                newMessage={newMessage}
                onChangeMessage={onChangeMessage}
                onSend={onSend}
                onSendFile={onSendFile}
                onPlayTrack={onPlayTrack}
                currentUserName={currentUserName}
                onClose={closeChat}
                variant="thread"
                sheet
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors, isWide: boolean) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 50,
      // No elevation here — a full-screen elevated view steals touches on Android.
    },
    layoutProbe: {
      ...StyleSheet.absoluteFill,
    },
    fabWrap: {
      position: 'absolute',
      zIndex: 51,
      width: FAB_SIZE,
      height: FAB_SIZE,
      elevation: 10,
    },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      ...(Platform.OS === 'web'
        ? ({ boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer' } as const)
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.22,
            shadowRadius: 10,
            elevation: 8,
          }),
    },
    fabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      backgroundColor: colors.destructive,
      borderWidth: 2,
      borderColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    sheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      height: SHEET_HEIGHT,
      maxHeight: 640,
      maxWidth: isWide ? 420 : undefined,
      width: isWide ? '100%' : undefined,
      alignSelf: isWide ? 'flex-end' : 'stretch',
      marginRight: isWide ? 16 : 0,
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 -8px 32px rgba(0,0,0,0.18)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 12,
          }),
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: `${colors.border}CC`,
      marginTop: 8,
      marginBottom: 4,
    },
    sheetBody: {
      flex: 1,
      minHeight: 0,
    },
  });
}
