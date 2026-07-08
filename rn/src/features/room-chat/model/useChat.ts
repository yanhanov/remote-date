import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { socketService } from '@/shared/api/socket.service';
import type { ChatMessage } from '@/shared/api/chat.types';
import { API_BASE_URL } from '@/shared/config/api';
import { useAuth } from '@/entities/user/model/auth.store';

export function useChat(roomId: string) {
  const { user, refreshUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  const getDisplayName = useCallback(() => {
    if (!user) return 'Guest';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email || 'Guest';
  }, [user]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    setCurrentUserName(getDisplayName());
  }, [getDisplayName]);

  useEffect(() => {
    const onMessage = (msg: ChatMessage) => {
      if (msg.room === roomId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socketService.on('chat:message', onMessage);

    void (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/chat/${roomId}`);
        if (res.ok) {
          const history = (await res.json()) as ChatMessage[];
          setMessages(history);
        }
      } catch {
        Alert.alert('Error', 'Failed to load chat history');
      }
    })();

    return () => {
      socketService.off('chat:message', onMessage);
    };
  }, [roomId]);

  const buildMessage = useCallback(
    (text: string, trackUrl?: string, imageUrl?: string): ChatMessage => ({
      room: roomId,
      author: getDisplayName(),
      text,
      time: Date.now(),
      trackUrl,
      imageUrl,
    }),
    [roomId, getDisplayName],
  );

  const send = useCallback(() => {
    if (!newMessage.trim()) return;

    if (!socketService.isConnected()) {
      Alert.alert('Error', 'Message not sent. Check your connection');
      return;
    }

    const text = newMessage.trim();
    const urlRegex = /https?:\/\/\S+/g;
    const urls = text.match(urlRegex) || [];

    const isSoundCloudUrl = (url: string) =>
      /^https?:\/\/(soundcloud\.com|on\.soundcloud\.com)\//i.test(url);
    const isImageUrl = (url: string) =>
      /\.(png|jpe?g|gif|webp)$/i.test(url) ||
      url.includes('image=') ||
      url.includes('img=') ||
      url.includes('photo=');

    let trackUrl: string | undefined;
    let imageUrl: string | undefined;

    for (const url of urls) {
      if (!trackUrl && isSoundCloudUrl(url)) trackUrl = url;
      if (!imageUrl && isImageUrl(url)) imageUrl = url;
    }

    socketService.emit('chat:send', buildMessage(text, trackUrl, imageUrl));
    setNewMessage('');
  }, [newMessage, buildMessage]);

  const sendFile = useCallback(
  async (mode: 'image' | 'audio') => {
    if (!socketService.isConnected()) {
      Alert.alert('Error', 'File not sent. Check your connection');
      return;
    }

    if (mode === 'image') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      const mime = result.assets[0].mimeType ?? 'image/jpeg';
      const imageUrl = `data:${mime};base64,${result.assets[0].base64}`;
      const fileName = result.assets[0].fileName ?? 'image.jpg';
      socketService.emit('chat:send', buildMessage(fileName, undefined, imageUrl));
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.base64) {
      const mime = asset.mimeType ?? 'audio/mpeg';
      const trackUrl = `data:${mime};base64,${asset.base64}`;
      socketService.emit('chat:send', buildMessage(asset.name, trackUrl));
    }
  },
  [buildMessage],
);

  return { messages, newMessage, setNewMessage, send, sendFile, currentUserName };
}
