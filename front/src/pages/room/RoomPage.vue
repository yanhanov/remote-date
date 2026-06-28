<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useRoom } from '@/entities/room'
import { useChat, RoomChatPanel } from '@/features/room-chat'
import {
  YoutubePlayerCard,
  YoutubeVideoSearch,
  useYoutubePlayer,
} from '@/features/room-player'
import { RoomShareCard } from '@/features/room-share'
import type { YoutubeVideo } from '@/shared/api/youtube.api'
import { youtubeWatchUrl } from '@/features/room-player/model/youtube.utils'

const route = useRoute()
const router = useRouter()

const roomId = route.params.id as string

const { room, loading, error, participants, currentUrl, loadedAt, load, join, leave } =
  useRoom(roomId)

const { messages, newMessage, send, currentUserName } = useChat(roomId)

const { playerError, setup: setupPlayer, teardown: teardownPlayer, changeVideo } =
  useYoutubePlayer(roomId, room, loadedAt)

const hasVideo = computed(() => Boolean(room.value?.youtubeVideoId))

onMounted(async () => {
  try {
    await load()

    if (room.value?.type !== 'youtube') {
      error.value = 'This is not a YouTube room'
      loading.value = false
      return
    }

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

function handleVideoSelect(video: YoutubeVideo) {
  changeVideo({
    videoId: video.videoId,
    youtubeUrl: youtubeWatchUrl(video.videoId),
    title: video.title,
    channelTitle: video.channelTitle,
    thumbnailUrl: video.thumbnailUrl ?? undefined,
  })
}
</script>

<template>
  <div class="room-page flex w-full flex-1 flex-col p-4 md:p-6 min-h-0">
    <div
      v-if="loading"
      class="room-page__loading overflow-hidden rounded-xl border border-border/60 bg-card/40 p-4"
    >
      <Skeleton class="room-page__skeleton aspect-video w-full rounded-lg" />
    </div>

    <div
      v-else-if="error"
      class="room-page__error flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <p class="room-page__error-text text-sm text-destructive">{{ error }}</p>
      <Button class="room-page__error-action h-9" variant="secondary" @click="router.push('/youtube')">
        Back to YouTube
      </Button>
    </div>

    <div
      v-else-if="room"
      class="room-page__content grid w-full min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:min-h-[calc(100svh-8.5rem)]"
    >
      <div class="room-page__main flex h-full min-h-[480px] min-w-0 flex-col gap-3">
        <section
          class="room-page__search-panel shrink-0 rounded-xl border border-border/60 bg-card/40 p-4"
        >
          <div class="room-page__search-header mb-3 space-y-0.5">
            <h2 class="room-page__search-title text-sm font-medium">Choose a video</h2>
            <p class="room-page__search-description text-xs text-muted-foreground">
              Everyone in the room watches the same video.
            </p>
          </div>
          <YoutubeVideoSearch class="room-page__search" @select="handleVideoSelect" />
        </section>

        <YoutubePlayerCard
          class="room-page__player min-h-0 flex-1"
          :room-id="room.id"
          :participants="participants"
          :has-video="hasVideo"
          :error="playerError"
        />

        <RoomShareCard
          class="room-page__share shrink-0"
          :url="currentUrl"
          @copy="copyLink"
        />
      </div>

      <RoomChatPanel
        class="room-page__chat h-full min-h-[480px] min-w-0"
        :messages="messages"
        v-model:new-message="newMessage"
        :current-user-name="currentUserName"
        @send="send"
      />
    </div>
  </div>
</template>
