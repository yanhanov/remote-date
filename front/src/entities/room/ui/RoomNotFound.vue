<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowLeft, PhHouse, PhWarningCircle } from '@phosphor-icons/vue'
import type { RoomType } from '@/shared/api/room.types'
import { Button } from '@/shared/ui/button'

const props = defineProps<{
  roomId: string
  roomType: RoomType
  error?: string | null
}>()

const router = useRouter()

const isWrongType = computed(() => {
  const msg = (props.error ?? '').toLowerCase()
  return msg.includes('not a youtube') || msg.includes('not a soundcloud')
})

const title = computed(() =>
  isWrongType.value ? 'Wrong room type' : 'Room not found',
)

const description = computed(() => {
  if (isWrongType.value) {
    return props.roomType === 'youtube'
      ? 'This link opens a SoundCloud room, not a YouTube watch party. Go to SoundCloud to join it, or create a new YouTube room.'
      : 'This link opens a YouTube room, not a SoundCloud session. Go to YouTube to join it, or create a new SoundCloud room.'
  }

  return 'This room may have expired after 24 hours without anyone in it, the invite link may be outdated, or the room no longer exists. Create a new room or ask the host to send a fresh invite.'
})

const shortRoomId = computed(() => props.roomId.slice(0, 8))

function goBack() {
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/')
}
</script>

<template>
  <section
    class="room-not-found flex flex-1 flex-col items-center justify-center px-4 py-16 md:px-6"
  >
    <div
      class="room-not-found__card w-full max-w-md rounded-2xl border border-border/60 bg-card/40 p-6 text-center shadow-sm md:p-8"
    >
      <span
        class="room-not-found__icon mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10"
      >
        <PhWarningCircle class="size-6 text-destructive" />
      </span>

      <h1 class="room-not-found__title text-lg font-semibold tracking-tight">
        {{ title }}
      </h1>

      <p class="room-not-found__description mt-2 text-sm leading-relaxed text-muted-foreground">
        {{ description }}
      </p>

      <p class="room-not-found__room-id mt-3 text-xs text-muted-foreground/80">
        Room ID: <span class="font-mono">{{ shortRoomId }}</span>
      </p>

      <div class="room-not-found__actions mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="secondary"
          class="room-not-found__back h-9 gap-2"
          @click="goBack"
        >
          <PhArrowLeft class="size-4" />
          Back
        </Button>

        <Button
          type="button"
          class="room-not-found__home h-9 gap-2"
          @click="router.push('/')"
        >
          <PhHouse class="size-4" />
          Home
        </Button>
      </div>
    </div>
  </section>
</template>
