<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { toast } from 'vue-sonner'
import { PhX } from '@phosphor-icons/vue'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useRoom, RoomNotFound } from '@/entities/room'
import { useChat, RoomChatPanel, RoomCompactChat } from '@/features/room-chat'
import {
  YoutubePlayerCard,
  YoutubeVideoSearch,
  useYoutubePlayer,
  useRoomTheater,
} from '@/features/room-player'
import { RoomShareCard } from '@/features/room-share'
import type { YoutubeVideo } from '@/shared/api/youtube.api'
import { youtubeWatchUrl } from '@/features/room-player/model/youtube.utils'

const route = useRoute()

const roomId = route.params.id as string

const { room, loading, error, participants, currentUrl, loadedAt, load, join, leave } =
  useRoom(roomId)

const { messages, newMessage, send, currentUserName } = useChat(roomId)

const { playerError, setup: setupPlayer, teardown: teardownPlayer, changeVideo, syncLayout } =
  useYoutubePlayer(roomId, room, loadedAt)

const { isTheater, exitTheater, toggleTheater } = useRoomTheater()

const hasVideo = computed(() => Boolean(room.value?.youtubeVideoId))

watch(isTheater, (active) => {
  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/70cb9cea-c092-4f94-92a0-53aa04217325', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '86925f' },
    body: JSON.stringify({
      sessionId: '86925f',
      location: 'RoomPage.vue:watch(isTheater)',
      message: 'theater toggled',
      data: { active },
      timestamp: Date.now(),
      hypothesisId: 'E',
    }),
  }).catch(() => {})
  // #endregion
  void syncLayout()
})

onMounted(async () => {
  try {
    await load()

    if (room.value?.type !== 'youtube') {
      error.value = 'This is not a YouTube room'
      toast.error('This is not a YouTube room')
      loading.value = false
      return
    }

    join()
    await setupPlayer()
  } catch (err: unknown) {
    console.error('Error in onMounted:', err)
    const message = err instanceof Error ? err.message : 'Failed to load room'
    error.value = message
    toast.error(message)
    loading.value = false
  }
})

onBeforeRouteLeave(() => {
  exitTheater()
  leave()
  teardownPlayer()
})

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
  <div
    class="room-page flex w-full flex-1 flex-col min-h-0"
    :class="isTheater ? 'p-0' : 'p-4 md:p-6'"
  >
    <div
      v-if="loading"
      class="room-page__loading overflow-hidden surface p-4"
    >
      <Skeleton class="room-page__skeleton aspect-video w-full rounded-lg" />
    </div>

    <RoomNotFound
      v-else-if="error"
      class="room-page__error"
      :room-id="roomId"
      room-type="youtube"
      :error="error"
    />

    <div
      v-else-if="room"
      class="room-page__shell w-full min-h-0"
      :class="
        isTheater
          ? 'room-page__shell--theater fixed inset-0 z-50 flex h-svh flex-col overflow-hidden bg-zinc-950'
          : 'room-page__content grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:min-h-[calc(100svh-8.5rem)]'
      "
    >
        <div
          class="room-page__main relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
          :class="isTheater ? 'gap-0' : 'min-h-[480px] gap-3'"
        >
          <header
            v-if="isTheater"
            class="room-page__theater-bar flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4"
          >
            <div class="room-page__theater-bar-meta min-w-0">
              <p class="room-page__theater-bar-title truncate text-sm font-medium text-white">
                Watch party
              </p>
              <p class="room-page__theater-bar-subtitle truncate text-xs text-white/50">
                Room {{ room.id.slice(0, 8) }} · {{ participants }} watching
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="room-page__theater-exit size-8 shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Exit fullscreen"
              @click="exitTheater"
            >
              <PhX class="size-4" />
            </Button>
          </header>

          <section
            v-show="!isTheater"
            class="room-page__search-panel shrink-0 surface p-4"
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
            :theater="isTheater"
            @toggle-theater="toggleTheater"
          />

          <RoomCompactChat
            v-if="isTheater"
            :messages="messages"
            v-model:new-message="newMessage"
            :current-user-name="currentUserName"
            theater
            @send="send"
          />

          <RoomShareCard
            v-show="!isTheater"
            class="room-page__share shrink-0"
            :url="currentUrl"
            room-type="youtube"
          />
        </div>

        <RoomChatPanel
          v-if="!isTheater"
          class="room-page__chat h-full min-h-[480px] min-w-0"
          :messages="messages"
          v-model:new-message="newMessage"
          :current-user-name="currentUserName"
          @send="send"
        />
    </div>
  </div>
</template>
