<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhLink, PhSpinner } from '@phosphor-icons/vue'
import { UserAvatar } from '@/entities/user'
import type { RoomType } from '@/shared/api/room.types'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useRoomInvite } from '../model/use-room-invite'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  url: string
  roomType: RoomType
}>()

const {
  friends,
  isLoadingFriends,
  invitedUserIds,
  loadFriends,
  copyLink,
  inviteFriend,
  restoreInvited,
} = useRoomInvite(
  () => props.url,
  () => props.roomType,
)

watch(open, (isOpen) => {
  if (isOpen) {
    restoreInvited()
    void loadFriends()
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="room-invite-dialog sm:max-w-md">
      <DialogHeader class="room-invite-dialog__header">
        <DialogTitle class="room-invite-dialog__title">Invite participant</DialogTitle>
        <DialogDescription class="room-invite-dialog__description">
          Copy the room link or invite a friend directly — they will get a message with a join
          link.
        </DialogDescription>
      </DialogHeader>

      <div class="room-invite-dialog__body space-y-4">
        <Button
          type="button"
          variant="secondary"
          class="room-invite-dialog__copy-link w-full"
          @click="copyLink"
        >
          <PhLink class="size-4" />
          Copy link
        </Button>

        <div class="room-invite-dialog__friends space-y-2">
          <p class="room-invite-dialog__friends-label text-xs font-medium text-muted-foreground">
            Invite a friend
          </p>

          <div
            v-if="isLoadingFriends"
            class="room-invite-dialog__friends-loading flex justify-center py-6"
          >
            <PhSpinner class="size-5 animate-spin text-muted-foreground" />
          </div>

          <p
            v-else-if="!friends.length"
            class="room-invite-dialog__friends-empty rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-sm text-muted-foreground"
          >
            No friends yet.
            <RouterLink to="/friends" class="text-primary hover:underline" @click="open = false">
              Add friends
            </RouterLink>
            to invite them directly.
          </p>

          <ul v-else class="room-invite-dialog__friends-list max-h-56 space-y-1 overflow-y-auto">
            <li
              v-for="friend in friends"
              :key="friend.userId"
              class="room-invite-dialog__friend flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <UserAvatar :user="friend" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ friend.displayName }}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                class="room-invite-dialog__friend-invite shrink-0"
                :disabled="invitedUserIds.has(friend.userId)"
                @click="inviteFriend(friend.userId)"
              >
                {{ invitedUserIds.has(friend.userId) ? 'Sent' : 'Invite' }}
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
