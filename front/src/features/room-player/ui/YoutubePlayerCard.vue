<script setup lang="ts">
import { YOUTUBE_PLAYER_ELEMENT_ID } from "../model/youtube.types";

defineProps<{
  roomId: string;
  participants: number;
  hasVideo?: boolean;
  error?: string | null;
}>();
</script>

<template>
  <section
    class="youtube-player-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40"
  >
    <header
      class="youtube-player-card__header flex shrink-0 items-center justify-between border-b border-border/40 px-4 py-3"
    >
      <span
        class="youtube-player-card__room-id text-xs font-medium text-muted-foreground"
      >
        Room {{ roomId.slice(0, 8) }}
      </span>
      <span
        class="youtube-player-card__participants text-xs text-muted-foreground"
      >
        {{ participants }} online
      </span>
    </header>

    <div class="youtube-player-card__content flex min-h-0 flex-1 flex-col p-3">
      <div
        class="youtube-player-card__viewport relative min-h-[180px] flex-1 overflow-hidden rounded-lg bg-black"
      >
        <div
          v-if="!hasVideo"
          class="youtube-player-card__placeholder absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/60"
        >
          Search for a video or paste a link to start watching.
        </div>
        <div
          :id="YOUTUBE_PLAYER_ELEMENT_ID"
          class="youtube-player-card__target absolute inset-0"
        />
      </div>

      <p
        v-if="error"
        class="youtube-player-card__error mt-2 shrink-0 text-xs text-destructive"
      >
        {{ error }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.youtube-player-card__target :deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
