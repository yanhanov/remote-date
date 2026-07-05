<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { PhClockCounterClockwise } from '@phosphor-icons/vue'
import type { RoomType, VideoRoom } from '@/shared/api/room.types'

const props = defineProps<{
  room: VideoRoom
  roomType: RoomType
}>()

const router = useRouter()

const roomPath = computed(() =>
  props.roomType === 'youtube' ? `/room/${props.room.id}` : `/sound-room/${props.room.id}`,
)

const subtitle = computed(() => {
  if (props.roomType === 'youtube' && props.room.youtubeVideoId) {
    return 'Continue where you left off'
  }
  if (props.roomType === 'soundcloud' && props.room.soundcloudTitle) {
    return props.room.soundcloudTitle
  }
  return `Room ${props.room.id.slice(0, 8)}`
})

const participantsLabel = computed(() => {
  const count = props.room.participants
  if (count === 0) return 'No one watching now'
  if (count === 1) return '1 watching'
  return `${count} watching`
})

function openRoom() {
  router.push(roomPath.value)
}
</script>

<template>
  <button
    type="button"
    class="last-room-card surface flex w-full items-center gap-3 border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
    @click="openRoom"
  >
    <span
      class="last-room-card__icon flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10"
    >
      <PhClockCounterClockwise class="size-4 text-primary" />
    </span>

    <span class="last-room-card__body min-w-0 flex-1">
      <span class="last-room-card__title block text-sm font-medium">Your last room</span>
      <span class="last-room-card__subtitle mt-0.5 block truncate text-xs text-muted-foreground">
        {{ subtitle }}
      </span>
      <span class="last-room-card__meta mt-1 block text-[11px] text-muted-foreground/80">
        {{ participantsLabel }}
      </span>
    </span>
  </button>
</template>
