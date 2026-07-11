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
import { ChatCircle, X } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
const COMPACT_W = 300;
const COMPACT_H = 280;
const COMPACT_MARGIN = 12;

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
  /** Overlay compact chat over fullscreen video (Vue RoomCompactChat). */
  theater?: boolean;
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
  theater = false,
}: RoomFloatingChatProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useResponsive();
  const styles = useMemo(
    () => createStyles(colors, isWide, insets.top, insets.bottom),
    [colors, isWide, insets.top, insets.bottom],
  );

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

  // Match Vue: show the floating chat panel when entering theater.
  useEffect(() => {
    if (theater) {
      setOpen(true);
      setSeenCount(messageCount);
    } else {
      setOpen(false);
    }
    // intentionally only react to theater toggles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theater]);

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
      : {
          right: FAB_MARGIN,
          bottom: theater ? FAB_MARGIN + insets.bottom : FAB_MARGIN,
          left: undefined,
          top: undefined,
        };

  const compactLeft =
    bounds.w > 0
      ? Math.max(COMPACT_MARGIN, bounds.w - COMPACT_W - COMPACT_MARGIN)
      : COMPACT_MARGIN;
  const compactTop =
    bounds.h > 0
      ? Math.max(insets.top + 56, bounds.h - COMPACT_H - COMPACT_MARGIN - insets.bottom)
      : 120;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
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
            style={({ pressed }) => [
              styles.fab,
              theater && styles.fabTheater,
              pressed && styles.fabPressed,
            ]}
            accessibilityLabel="Open room chat"
            accessibilityRole="button"
          >
            <ChatCircle
              size={24}
              color={theater ? '#fff' : colors.primaryForeground}
              weight="fill"
            />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      {/* Theater: floating panel over video (Vue RoomCompactChat) — no Modal so WebView stays. */}
      {theater && open ? (
        <KeyboardAvoidingView
          style={styles.compactRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.compactPanel,
              {
                left: compactLeft,
                top: compactTop,
                width: Math.min(COMPACT_W, Math.max(200, bounds.w - COMPACT_MARGIN * 2 || COMPACT_W)),
                height: COMPACT_H,
              },
            ]}
            pointerEvents="auto"
          >
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle}>Chat</Text>
              <Pressable
                onPress={closeChat}
                style={({ pressed }) => [
                  styles.compactClose,
                  pressed && styles.compactClosePressed,
                ]}
                accessibilityLabel="Remove chat panel"
              >
                <X size={14} color="rgba(255,255,255,0.75)" weight="bold" />
              </Pressable>
            </View>
            <View style={styles.compactBody}>
              <RoomChatPanel
                messages={messages}
                newMessage={newMessage}
                onChangeMessage={onChangeMessage}
                onSend={onSend}
                onSendFile={onSendFile}
                onPlayTrack={onPlayTrack}
                currentUserName={currentUserName}
                variant="thread"
                compact
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {/* Normal room: bottom sheet modal */}
      {!theater ? (
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
      ) : null}
    </View>
  );
}

function createStyles(
  colors: ThemeColors,
  isWide: boolean,
  _topInset: number,
  _bottomInset: number,
) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 50,
    },
    layoutProbe: {
      ...StyleSheet.absoluteFill,
    },
    fabWrap: {
      position: 'absolute',
      zIndex: 51,
      width: FAB_SIZE,
      height: FAB_SIZE,
      // No elevation on Android — blanks YouTube WebView under the overlay.
      ...(Platform.OS === 'android' ? null : { elevation: 10 }),
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
        : Platform.OS === 'ios'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.22,
              shadowRadius: 10,
            }
          : null),
    },
    fabTheater: {
      backgroundColor: 'rgba(24,24,27,0.92)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.15)',
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
    compactRoot: {
      ...StyleSheet.absoluteFill,
      zIndex: 52,
    },
    compactPanel: {
      position: 'absolute',
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: 'rgba(9,9,11,0.92)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.15)',
      // Avoid elevation on Android — it can blank the WebView underneath.
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }
        : Platform.OS === 'ios'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
            }
          : null),
    },
    compactHeader: {
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    compactTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    compactClose: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactClosePressed: {
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    compactBody: {
      flex: 1,
      minHeight: 0,
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
