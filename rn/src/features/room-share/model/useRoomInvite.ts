import { useCallback, useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import { useAuth } from '@/entities/user/model/auth.store';
import { socketService } from '@/shared/api/socket.service';
import { socialAPI } from '@/shared/api/social.api';
import type { FriendItem } from '@/shared/api/social.types';
import type { RoomType } from '@/shared/api/room.types';
import {
  buildRoomInviteMessage,
  buildRoomShareUrl,
  inviteLabel,
  loadInvitedUserIds,
  saveInvitedUserId,
} from '@/shared/lib/room-invite-message';

function inviterName(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return 'Someone';
  if (user.firstName) return user.firstName;
  if (user.username) return user.username;
  return 'Someone';
}

export function useRoomInvite(roomId: string, roomType: RoomType) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());

  const shareUrl = buildRoomShareUrl(roomType, roomId);

  const restoreInvited = useCallback(async () => {
    setInvitedUserIds(await loadInvitedUserIds(roomId));
  }, [roomId]);

  const loadFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    try {
      setFriends(await socialAPI.getFriends());
    } catch (err: unknown) {
      setFriends([]);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  const copyLink = useCallback(async () => {
    const message = `Join my ${inviteLabel(roomType).toLowerCase()}!\n${shareUrl}\nRoom ID: ${roomId}`;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(message);
        Alert.alert('Copied', 'Room link copied to clipboard');
        return true;
      } catch {
        Alert.alert('Error', 'Could not copy link');
        return false;
      }
    }

    try {
      await Share.share({ message });
      return true;
    } catch {
      return false;
    }
  }, [roomId, roomType, shareUrl]);

  const inviteFriend = useCallback(
    (userId: string) => {
      if (invitedUserIds.has(userId)) {
        Alert.alert('Already sent', 'Invitation already sent to this friend');
        return;
      }

      const friend = friends.find((item) => item.userId === userId);
      const text = buildRoomInviteMessage({
        roomType,
        url: shareUrl,
        roomId,
        inviterName: inviterName(user),
        label: inviteLabel(roomType),
      });

      socketService.connectAuthenticated();
      socketService.emit('dm:send', { recipientId: userId, text });

      void saveInvitedUserId(roomId, userId).then(() => {
        setInvitedUserIds((prev) => new Set([...prev, userId]));
      });

      Alert.alert('Sent', `Invitation sent to ${friend?.displayName ?? 'friend'}`);
    },
    [friends, invitedUserIds, roomId, roomType, shareUrl, user],
  );

  return {
    friends,
    isLoadingFriends,
    invitedUserIds,
    shareUrl,
    loadFriends,
    copyLink,
    inviteFriend,
    restoreInvited,
  };
}
