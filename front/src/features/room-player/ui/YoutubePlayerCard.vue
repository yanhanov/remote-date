<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { YOUTUBE_PLAYER_ELEMENT_ID } from '../model/youtube.types'

defineProps<{
  roomId: string
  participants: number
  error?: string | null
}>()
</script>

<template>
  <Card class="youtube-player-card">
    <CardHeader class="youtube-player-card__header">
      <CardTitle class="youtube-player-card__title flex items-center justify-between">
        <span class="youtube-player-card__room-id">Room: {{ roomId.slice(0, 8) }}...</span>
        <span class="youtube-player-card__participants text-sm font-normal">
          Participants: {{ participants }}
        </span>
      </CardTitle>
    </CardHeader>
    <CardContent class="youtube-player-card__content">
      <div
        class="youtube-player-card__viewport aspect-video w-full overflow-hidden rounded-lg bg-black relative"
      >
        <div
          :id="YOUTUBE_PLAYER_ELEMENT_ID"
          class="youtube-player-card__target absolute inset-0"
        />
      </div>
      <p v-if="error" class="youtube-player-card__error mt-2 text-sm text-red-500">
        {{ error }}
      </p>
    </CardContent>
  </Card>
</template>

<style scoped>
.youtube-player-card__target :deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
