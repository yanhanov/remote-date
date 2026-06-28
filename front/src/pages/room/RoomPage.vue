<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useRoom } from '@/entities/room'
import { useChat, RoomChatPanel } from '@/features/room-chat'
import { YoutubePlayerCard, useYoutubePlayer } from '@/features/room-player'
import { RoomShareCard } from '@/features/room-share'

const route = useRoute()
const router = useRouter()

const roomId = route.params.id as string

const { room, loading, error, participants, currentUrl, loadedAt, load, join, leave } =
  useRoom(roomId)

const { messages, newMessage, send, currentUserName } = useChat(roomId)

const { playerError, setup: setupPlayer, teardown: teardownPlayer } = useYoutubePlayer(
  roomId,
  room,
  loadedAt,
)

onMounted(async () => {
  try {
    await load()
    join()
    await setupPlayer()
  } catch (err: unknown) {
    console.error('Error in onMounted:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load room'
    loading.value = false
  }
})

onBeforeRouteLeave(() => {
  leave()
  teardownPlayer()
})

function copyLink() {
  navigator.clipboard.writeText(currentUrl.value)
  alert('Link copied!')
}
</script>

<template>
  <div class="room-page p-6 space-y-4">
    <Card v-if="loading" class="room-page__loading">
      <CardContent class="room-page__loading-content p-6">
        <Skeleton class="room-page__skeleton w-full h-96" />
      </CardContent>
    </Card>

    <div v-else-if="error" class="room-page__error text-center space-y-4">
      <p class="room-page__error-text text-red-500">{{ error }}</p>
      <Button class="room-page__error-action" @click="router.push('/')">Go Home</Button>
    </div>

    <div v-else-if="room" class="room-page__content space-y-4">
      <YoutubePlayerCard
        class="room-page__player"
        :room-id="room.id"
        :participants="participants"
        :error="playerError"
      />

      <RoomShareCard
        class="room-page__share"
        :url="currentUrl"
        @copy="copyLink"
      />

      <RoomChatPanel
        class="room-page__chat"
        :messages="messages"
        v-model:new-message="newMessage"
        :current-user-name="currentUserName"
        @send="send"
      />
    </div>
  </div>
</template>
