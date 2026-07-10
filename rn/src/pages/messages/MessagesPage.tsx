import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { AppStackParamList } from '@/app/navigation/types';
import { socialAPI } from '@/shared/api/social.api';
import type { ConversationItem, DirectMessageItem } from '@/shared/api/social.types';
import { useDirectMessages } from '@/features/direct-message/model/useDirectMessages';
import { MessagesConversationList } from '@/features/direct-message/ui/MessagesConversationList';
import { MessagesThreadPanel } from '@/features/direct-message/ui/MessagesThreadPanel';
import { useResponsive } from '@/shared/lib/use-responsive';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface MessagesPageProps {
  userId?: string;
  navigation: NavigationProp<AppStackParamList>;
  threadOnly?: boolean;
}

export function MessagesPage({ userId, navigation, threadOnly = false }: MessagesPageProps) {
  const { colors } = useTheme();
  const { isLg } = useResponsive();
  const styles = useMemo(() => createStyles(colors, isLg), [colors, isLg]);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const reloadConversations = useCallback(async () => {
    try {
      setConversations(await socialAPI.getConversations());
    } catch {
      setConversations([]);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    // handled inside MessagesThreadPanel
  }, []);

  const { sendMessage } = useDirectMessages({
    messages,
    setMessages,
    conversations,
    setConversations,
    activeUserId: userId ?? null,
    onThreadMessage: scrollToBottom,
    reloadConversations,
  });

  useEffect(() => {
    void reloadConversations().finally(() => setIsLoadingList(false));
  }, [reloadConversations]);

  function openConversation(nextUserId: string) {
    navigation.navigate('MessagesThread', { userId: nextUserId });
  }

  function closeConversation() {
    navigation.navigate('Messages');
  }

  const showSidebar = isLg || !threadOnly;
  const showThread = isLg || threadOnly;

  return (
    <View style={styles.page}>
      <View style={styles.layout}>
        {showSidebar ? (
          <View style={[styles.sidebar, isLg && styles.sidebarDesktop]}>
            <MessagesConversationList
              conversations={conversations}
              activeUserId={userId}
              isLoading={isLoadingList}
              onSelect={openConversation}
            />
          </View>
        ) : null}

        {showThread ? (
          <View style={styles.thread}>
            <MessagesThreadPanel
              userId={userId ?? null}
              navigation={navigation}
              messages={messages}
              setMessages={setMessages}
              onSend={(text) => (userId ? sendMessage(userId, text) : false)}
              showBackButton={!isLg && threadOnly}
              onBack={closeConversation}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, isLg: boolean) {
  return StyleSheet.create({
    page: {
      flex: 1,
      minHeight: 0,
      backgroundColor: colors.background,
    },
    layout: {
      flex: 1,
      minHeight: 0,
      flexDirection: isLg ? 'row' : 'column',
    },
    sidebar: {
      flex: isLg ? undefined : 1,
      width: isLg ? 320 : undefined,
      minWidth: isLg ? 280 : undefined,
      maxWidth: isLg ? 320 : undefined,
      minHeight: 0,
      borderRightWidth: isLg ? 1 : 0,
      borderRightColor: `${colors.border}B3`,
    },
    sidebarDesktop: {
      flexShrink: 0,
    },
    thread: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
    },
  });
}
