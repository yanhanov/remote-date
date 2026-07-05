<script setup lang="ts">
import { computed } from 'vue'
import { parseRoomInvite } from '@/shared/lib/room-invite-message'
import MessageText from './MessageText.vue'
import RoomInviteMessage from './RoomInviteMessage.vue'

const props = defineProps<{
  text: string
  isOwn?: boolean
  createdAt?: string
}>()

const invite = computed(() => parseRoomInvite(props.text))
</script>

<template>
  <RoomInviteMessage
    v-if="invite"
    :invite="invite"
    :is-own="isOwn"
    :created-at="createdAt"
  />
  <MessageText v-else :text="text" />
</template>
