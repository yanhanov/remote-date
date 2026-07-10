import { useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinkSimple, UserPlus, X } from 'phosphor-react-native';
import { useAppNavigation } from '@/app/navigation/use-app-navigation';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import type { RoomType } from '@/shared/api/room.types';
import { useRoomInvite } from '@/features/room-share/model/useRoomInvite';

interface RoomInviteModalProps {
  visible: boolean;
  roomId: string;
  roomType: RoomType;
  onClose: () => void;
}

export function RoomInviteModal({ visible, roomId, roomType, onClose }: RoomInviteModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { navigate } = useAppNavigation();
  const {
    friends,
    isLoadingFriends,
    invitedUserIds,
    loadFriends,
    copyLink,
    inviteFriend,
    restoreInvited,
  } = useRoomInvite(roomId, roomType);

  useEffect(() => {
    if (!visible) return;
    void restoreInvited();
    void loadFriends();
  }, [visible, restoreInvited, loadFriends]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Invite participant</Text>
              <Text style={styles.description}>
                Copy the room link or invite a friend directly — they will get a message with a join
                link.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>

          <Button
            title="Copy link"
            variant="outline"
            onPress={() => void copyLink()}
            icon={<LinkSimple size={16} color={colors.foreground} />}
          />

          <Text style={styles.sectionLabel}>Invite a friend</Text>

          {isLoadingFriends ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No friends yet. Add friends to invite them directly.
              </Text>
              <Button
                title="Go to Friends"
                variant="outline"
                onPress={() => {
                  onClose();
                  navigate('Friends');
                }}
              />
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {friends.map((friend) => {
                const sent = invitedUserIds.has(friend.userId);
                return (
                  <View key={friend.userId} style={styles.friendRow}>
                    <UserAvatar user={friend} size="sm" />
                    <Text style={styles.friendName} numberOfLines={1}>
                      {friend.displayName}
                    </Text>
                    <Button
                      title={sent ? 'Sent' : 'Invite'}
                      variant="outline"
                      disabled={sent}
                      onPress={() => inviteFriend(friend.userId)}
                      style={styles.inviteBtn}
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 20,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 16,
      maxHeight: '80%',
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerText: {
      flex: 1,
      gap: 6,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    description: {
      fontSize: 14,
      color: colors.muted,
      lineHeight: 20,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.muted,
    },
    loading: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    empty: {
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    list: {
      maxHeight: 240,
    },
    listContent: {
      gap: 4,
    },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    friendName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    inviteBtn: {
      minWidth: 76,
    },
  });
}
