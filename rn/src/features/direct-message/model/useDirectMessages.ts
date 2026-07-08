import { useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import { Alert } from 'react-native';
import { socketService } from '@/shared/api/socket.service';
import { useAuth } from '@/entities/user/model/auth.store';
import type {
  ConversationItem,
  DirectMessageItem,
  DmMessagePayload,
  DmStatusPayload,
} from '@/shared/api/social.types';

function deriveStatus(payload: DmMessagePayload, isOwn: boolean) {
  if (!isOwn) return undefined;
  if (payload.readAt || payload.status === 'read') return 'read' as const;
  if (payload.deliveredAt || payload.status === 'delivered') return 'delivered' as const;
  return payload.status ?? ('sent' as const);
}

function toDirectMessage(payload: DmMessagePayload, currentUserId: string): DirectMessageItem {
  const isOwn = payload.senderId === currentUserId;
  return {
    id: payload.id,
    senderId: payload.senderId,
    text: payload.text,
    createdAt: payload.createdAt,
    isOwn,
    status: deriveStatus(payload, isOwn),
    deliveredAt: payload.deliveredAt,
    readAt: payload.readAt,
  };
}

function peerUserId(payload: DmMessagePayload, currentUserId: string) {
  return payload.senderId === currentUserId ? payload.recipientId : payload.senderId;
}

export function useDirectMessages(options: {
  messages: DirectMessageItem[];
  setMessages: React.Dispatch<React.SetStateAction<DirectMessageItem[]>>;
  conversations: ConversationItem[];
  setConversations: React.Dispatch<React.SetStateAction<ConversationItem[]>>;
  activeUserId: string | null;
  onThreadMessage?: () => void;
  reloadConversations: () => Promise<void>;
}) {
  const { user } = useAuth();

  function markConversationRead(otherUserId: string) {
    socketService.connectAuthenticated();
    socketService.emit('dm:read', { otherUserId });
  }

  function updateConversationPreview(payload: DmMessagePayload, currentUserId: string) {
    const otherUserId = peerUserId(payload, currentUserId);
    const existingIndex = options.conversations.findIndex(
      (item) => item.conversationId === payload.conversationId || item.userId === otherUserId,
    );

    if (existingIndex === -1) {
      void options.reloadConversations();
      return;
    }

    const existing = options.conversations[existingIndex]!;
    const updated: ConversationItem = {
      userId: existing.userId,
      displayName: existing.displayName,
      avatarUrl: existing.avatarUrl,
      conversationId: payload.conversationId,
      lastMessageText: payload.text,
      lastMessageAt: payload.createdAt,
    };

    options.setConversations((prev) => [
      updated,
      ...prev.filter((_, index) => index !== existingIndex),
    ]);
  }

  function applyStatusUpdate(payload: DmStatusPayload) {
    options.setMessages((prev) =>
      prev.map((message) => {
        if (!payload.messageIds.includes(message.id) || !message.isOwn) return message;
        const updated = { ...message, status: payload.status };
        if (payload.status === 'delivered' && !updated.deliveredAt) {
          updated.deliveredAt = new Date().toISOString();
        }
        if (payload.status === 'read') {
          updated.readAt = new Date().toISOString();
          updated.deliveredAt ??= updated.readAt;
        }
        return updated;
      }),
    );
  }

  function handleIncomingMessage(payload: DmMessagePayload) {
    const currentUserId = user?.userId;
    if (!currentUserId) return;

    const otherUserId = peerUserId(payload, currentUserId);
    const message = toDirectMessage(payload, currentUserId);

    options.setMessages((prev) => {
      if (message.isOwn) {
        const pendingIndex = prev.findIndex(
          (item) => item.id.startsWith('pending-') && item.text === message.text,
        );
        if (pendingIndex !== -1) {
          const next = [...prev];
          next[pendingIndex] = message;
          return next;
        }
      }
      if (prev.some((item) => item.id === message.id)) return prev;
      return [...prev, message];
    });

    updateConversationPreview(payload, currentUserId);

    if (options.activeUserId === otherUserId) {
      options.onThreadMessage?.();
      if (!message.isOwn) {
        markConversationRead(otherUserId);
      }
    } else if (!message.isOwn) {
      Alert.alert('New message', 'You received a new message');
    }
  }

  function handleDmError(error: { message: string }) {
    options.setMessages((prev) =>
      prev.filter((item) => !(item.id.startsWith('pending-') && item.status === 'sending')),
    );
    Alert.alert('Error', error.message || 'Failed to send message');
  }

  function sendMessage(recipientId: string, text: string): boolean {
    const currentUserId = user?.userId;
    if (!currentUserId) return false;

    socketService.connectAuthenticated();

    if (options.activeUserId === recipientId) {
      options.setMessages((prev) => [
        ...prev,
        {
          id: `pending-${Crypto.randomUUID()}`,
          senderId: currentUserId,
          text,
          createdAt: new Date().toISOString(),
          isOwn: true,
          status: 'sending',
        },
      ]);
      options.onThreadMessage?.();
    }

    socketService.emit('dm:send', { recipientId, text });
    return true;
  }

  useEffect(() => {
    socketService.connectAuthenticated();
    socketService.on('dm:message', handleIncomingMessage);
    socketService.on('dm:status', applyStatusUpdate);
    socketService.on('dm:error', handleDmError);

    return () => {
      socketService.off('dm:message', handleIncomingMessage);
      socketService.off('dm:status', applyStatusUpdate);
      socketService.off('dm:error', handleDmError);
    };
  });

  return { sendMessage, markConversationRead };
}
