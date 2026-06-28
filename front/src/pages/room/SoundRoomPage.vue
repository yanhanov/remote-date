<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useRoom } from '@/entities/room'
import { useChat, RoomChatPanel } from '@/features/room-chat'
import {
  SoundPlayerBar,
  SoundcloudTrackSearch,
  SoundcloudNowPlaying,
  useSoundcloudPlayer,
} from '@/features/room-player'

const route = useRoute()
const router = useRouter()

const roomId = route.params.id as string

const { room, loading, error, participants, loadedAt, load, join, leave } = useRoom(roomId)

const { messages, newMessage, send, sendFile, currentUserName } = useChat(roomId)

const player = useSoundcloudPlayer(roomId, room, loadedAt)

const {
  currentTrackUrl,
  currentTrackTitle,
  currentTrackArtist,
  currentArtworkUrl,
  isPlaying,
  currentTime,
  duration,
  volume,
  muted,
  trackQueue,
  currentQueueIndex,
  isSelectingTrack,
  selectTrack,
  selectPlaylist,
  loadFromUrl,
  loadFromChat,
  togglePlay,
  onLoadedMetadata,
  onCanPlay,
  onTimeUpdate,
  onPlay,
  onPause,
  seek,
  toggleMute,
  changeVolume,
  playNextInQueue,
  playPrevInQueue,
  goToQueueIndex,
  reorderQueue,
  setup,
  teardown,
} = player

onMounted(async () => {
  try {
    await load()

    if (room.value?.type !== 'soundcloud') {
      error.value = 'SoundCloud room not found'
      loading.value = false
      return
    }

    join()
    setup()
  } catch (err: unknown) {
    console.error(err)
    error.value = err instanceof Error ? err.message : 'Failed to load SoundCloud room'
    loading.value = false
  }
})

onBeforeRouteLeave(() => {
  leave()
  teardown()
})
</script>

<template>
  <div class="sound-room-page flex w-full flex-1 flex-col min-h-0">
    <div v-if="loading" class="sound-room-page__loading p-4 md:p-6">
      <div class="overflow-hidden rounded-xl border border-border/60 bg-card/40 p-4">
        <Skeleton class="h-96 w-full rounded-lg" />
      </div>
    </div>

    <div
      v-else-if="error"
      class="sound-room-page__error flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <p class="sound-room-page__error-text text-sm text-destructive">{{ error }}</p>
      <Button
        class="sound-room-page__error-action h-9"
        variant="secondary"
        @click="router.push('/soundcloud')"
      >
        Back to SoundCloud
      </Button>
    </div>

    <template v-else-if="room">
      <div
        class="sound-room-page__content grid w-full min-h-0 flex-1 gap-4 p-4 pb-24 md:p-6 md:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:min-h-[calc(100svh-8.5rem)]"
      >
        <div class="sound-room-page__main flex h-full min-h-[480px] min-w-0 flex-col gap-3">
          <SoundcloudTrackSearch
            class="sound-room-page__search"
            :room-id="room.id"
            :participants="participants"
            :is-selecting-track="isSelectingTrack"
            @select-track="selectTrack"
            @select-playlist="selectPlaylist"
            @submit-url="loadFromUrl"
          />

          <SoundcloudNowPlaying
            class="sound-room-page__now-playing"
            :title="currentTrackTitle"
            :artist="currentTrackArtist"
            :artwork-url="currentArtworkUrl"
          />
        </div>

        <RoomChatPanel
          class="sound-room-page__chat h-full min-h-[480px] min-w-0"
          :messages="messages"
          v-model:new-message="newMessage"
          :current-user-name="currentUserName"
          @send="send"
          @play-track="loadFromChat"
          @send-file="sendFile"
        />
      </div>

      <SoundPlayerBar
        class="sound-room-page__player"
        :title="currentTrackTitle || 'No track selected'"
          :artist="currentTrackArtist || ''"
          :artwork-url="currentArtworkUrl || ''"
          :is-playing="isPlaying"
          :current-time="currentTime"
          :duration="duration"
          :can-play="!!currentTrackUrl"
          :volume="volume"
          :muted="muted"
          :queue="
            trackQueue.map((t) => ({
              id: t.id,
              title: t.title ?? null,
              artist: t.username ?? null,
            }))
          "
          :current-queue-index="currentQueueIndex ?? -1"
          :can-go-prev="(currentQueueIndex ?? 0) > 0 && trackQueue.length > 1"
          :can-go-next="
            (currentQueueIndex ?? -1) >= 0 &&
            (currentQueueIndex ?? 0) < trackQueue.length - 1
          "
          @toggle-play="togglePlay"
          @seek="seek"
          @toggle-mute="toggleMute"
          @change-volume="changeVolume"
          @prev="playPrevInQueue"
          @next="playNextInQueue"
        @select-queue-index="(index) => goToQueueIndex(index)"
        @reorder-queue="reorderQueue"
      />
    </template>

    <audio
      :ref="(el) => { player.audioRef.value = el as HTMLAudioElement | null }"
      class="hidden"
      :src="currentTrackUrl || undefined"
      @loadedmetadata="onLoadedMetadata"
      @canplay="onCanPlay"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="playNextInQueue"
    />
  </div>
</template>
