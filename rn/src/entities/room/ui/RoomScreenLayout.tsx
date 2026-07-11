import { useMemo, type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { UserPlus } from 'phosphor-react-native';
import { useResponsive } from '@/shared/lib/use-responsive';
import { MOBILE_NAV_HEIGHT } from '@/widgets/mobile-nav/MobileNav';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

const CHAT_MIN_HEIGHT = 480;

interface RoomScreenLayoutProps {
  main: ReactNode;
  chat?: ReactNode;
  footer?: ReactNode;
  /** Absolute FAB + full-screen thread chat */
  floatingChat?: ReactNode;
  /** Collapse chrome so the player can expand in-place. */
  fullscreen?: boolean;
}

export function RoomScreenLayout({
  main,
  chat,
  footer,
  floatingChat,
  fullscreen = false,
}: RoomScreenLayoutProps) {
  const { colors } = useTheme();
  const { isLg, isWide } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isWide), [colors, isWide]);
  const useFloating = Boolean(floatingChat);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {useFloating ? (
        <View style={[styles.floatingShell, fullscreen && styles.floatingShellFullscreen]}>
          {fullscreen || Platform.OS === 'android' ? (
            <View
              style={[
                styles.floatingScroll,
                fullscreen ? styles.floatingScrollFullscreen : styles.floatingScrollContent,
              ]}
            >
              {main}
            </View>
          ) : (
            <ScrollView
              style={styles.floatingScroll}
              contentContainerStyle={styles.floatingScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={false}
              nestedScrollEnabled
            >
              {main}
            </ScrollView>
          )}
          {floatingChat}
        </View>
      ) : isLg ? (
        <View style={styles.wideShell}>
          <View style={styles.mainColumn}>{main}</View>
          <View style={styles.chatColumn}>{chat}</View>
        </View>
      ) : (
        <View style={styles.mobileShell}>
          <ScrollView
            style={styles.mobileMainScroll}
            contentContainerStyle={styles.mobileMainContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {main}
          </ScrollView>
          <View style={styles.mobileChat}>{chat}</View>
        </View>
      )}
      {footer}
    </KeyboardAvoidingView>
  );
}

export function RoomPanelCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createPanelStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function RoomInviteButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createInviteStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      accessibilityLabel="Invite participant"
    >
      <UserPlus size={18} color={colors.muted} weight="bold" />
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, isWide: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    wideShell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 16,
      paddingHorizontal: 24,
      paddingVertical: 24,
      minHeight: 0,
    },
    mainColumn: {
      flex: 1,
      minWidth: 0,
      minHeight: CHAT_MIN_HEIGHT,
      gap: 12,
    },
    chatColumn: {
      width: 320,
      minWidth: 280,
      maxWidth: 340,
      minHeight: CHAT_MIN_HEIGHT,
      alignSelf: 'stretch',
    },
    floatingShell: {
      flex: 1,
      minHeight: 0,
      position: 'relative',
    },
    floatingShellFullscreen: {
      backgroundColor: '#000',
    },
    floatingScroll: {
      flex: 1,
      overflow: 'visible',
    },
    floatingScrollContent: {
      flexGrow: 1,
      paddingHorizontal: isWide ? 24 : 16,
      paddingTop: isWide ? 24 : 16,
      paddingBottom: isWide ? 96 : 88,
      gap: 16,
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center',
      overflow: 'visible',
    },
    floatingScrollFullscreen: {
      flex: 1,
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 0,
      maxWidth: undefined,
      width: '100%',
    },
    mobileShell: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: MOBILE_NAV_HEIGHT + 16,
      gap: 16,
    },
    mobileMainScroll: {
      flexGrow: 0,
      flexShrink: 1,
      maxHeight: '48%',
    },
    mobileMainContent: {
      gap: 12,
      paddingBottom: 4,
    },
    mobileChat: {
      flex: 1,
      minHeight: 240,
      minWidth: 0,
    },
  });
}

function createPanelStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
      flexShrink: 0,
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
      gap: 2,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    description: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
  });
}

function createInviteStyles(colors: ThemeColors) {
  return StyleSheet.create({
    btn: {
      width: 32,
      height: 32,
      borderRadius: colors.radius - 2,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    btnPressed: {
      opacity: 0.8,
    },
  });
}
