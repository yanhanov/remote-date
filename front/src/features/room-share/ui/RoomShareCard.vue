<script setup lang="ts">
import { ref } from 'vue'
import { PhUserPlus } from '@phosphor-icons/vue'
import type { RoomType } from '@/shared/api/room.types'
import { Button } from '@/shared/ui/button'
import RoomInviteDialog from './RoomInviteDialog.vue'

defineProps<{
  url: string
  roomType: RoomType
}>()

const inviteOpen = ref(false)
</script>

<template>
  <section class="room-share-card surface p-4">
    <Button
      type="button"
      variant="secondary"
      class="room-share-card__invite w-full"
      @click="inviteOpen = true"
    >
      <PhUserPlus class="size-4" />
      Invite participant
    </Button>

    <RoomInviteDialog v-model:open="inviteOpen" :url="url" :room-type="roomType" />
  </section>
</template>
