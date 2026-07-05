import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { authStore } from '@/entities/user'
import { socketService } from '@/shared/api/socket.service'
import { socialAPI } from '@/shared/api/social.api'
import type { FriendItem } from '@/shared/api/social.types'
import type { RoomType } from '@/shared/api/room.types'
import {
  buildRoomInviteMessage,
  extractRoomIdFromUrl,
  inviteLabel,
  loadInvitedUserIds,
  saveInvitedUserId,
} from '@/shared/lib/room-invite-message'

function inviterName(): string {
  const user = authStore.user.value
  if (!user) return 'Someone'
  if (user.firstName) return user.firstName
  if (user.username) return user.username
  return 'Someone'
}

export function useRoomInvite(getUrl: () => string, getRoomType: () => RoomType) {
  const friends = ref<FriendItem[]>([])
  const isLoadingFriends = ref(false)
  const invitedUserIds = ref<Set<string>>(new Set())

  function roomId(): string | null {
    return extractRoomIdFromUrl(getUrl())
  }

  function restoreInvited() {
    const id = roomId()
    invitedUserIds.value = id ? loadInvitedUserIds(id) : new Set()
  }

  async function loadFriends() {
    isLoadingFriends.value = true
    try {
      friends.value = await socialAPI.getFriends()
    } catch (e: unknown) {
      friends.value = []
      toast.error(e instanceof Error ? e.message : 'Failed to load friends')
    } finally {
      isLoadingFriends.value = false
    }
  }

  async function copyLink(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(getUrl())
      toast.success('Link copied to clipboard')
      return true
    } catch {
      toast.error('Could not copy link')
      return false
    }
  }

  function inviteFriend(userId: string) {
    if (invitedUserIds.value.has(userId)) {
      toast.info('Invitation already sent to this friend')
      return
    }

    const id = roomId()
    if (!id) {
      toast.error('Could not resolve room link')
      return
    }

    const friend = friends.value.find((item) => item.userId === userId)
    const roomType = getRoomType()
    const text = buildRoomInviteMessage({
      roomType,
      url: getUrl(),
      roomId: id,
      inviterName: inviterName(),
      label: inviteLabel(roomType),
    })

    socketService.connectAuthenticated()
    socketService.emit('dm:send', { recipientId: userId, text })

    saveInvitedUserId(id, userId)
    invitedUserIds.value = new Set([...invitedUserIds.value, userId])
    toast.success(`Invitation sent to ${friend?.displayName ?? 'friend'}`)
  }

  return {
    friends,
    isLoadingFriends,
    invitedUserIds,
    loadFriends,
    copyLink,
    inviteFriend,
    restoreInvited,
  }
}
