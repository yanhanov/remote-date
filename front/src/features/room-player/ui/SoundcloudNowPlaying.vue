<script setup lang="ts">
import SoundCloudIcon from '@/shared/ui/icons/SoundCloudIcon.vue'

defineProps<{
  title: string | null
  artist: string | null
  artworkUrl: string | null
}>()
</script>

<template>
  <section
    class="soundcloud-now-playing relative z-0 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-border/60 bg-gradient-to-b from-card/50 to-card/20 p-6 text-center"
  >
    <div
      class="soundcloud-now-playing__artwork mb-4 flex size-44 items-center justify-center overflow-hidden rounded-2xl bg-muted/40 shadow-sm sm:size-52"
    >
      <img
        v-if="artworkUrl"
        :src="artworkUrl"
        alt=""
        class="soundcloud-now-playing__artwork-image size-full object-cover"
      />
      <SoundCloudIcon
        v-else
        class="soundcloud-now-playing__artwork-placeholder size-10 text-[#ff5500]/70"
      />
    </div>

    <div class="soundcloud-now-playing__info max-w-sm space-y-1">
      <h2 class="soundcloud-now-playing__title truncate text-lg font-semibold tracking-tight">
        {{ title || 'No track selected' }}
      </h2>
      <p
        v-if="artist"
        class="soundcloud-now-playing__artist truncate text-sm text-muted-foreground"
      >
        {{ artist }}
      </p>
      <p v-else class="soundcloud-now-playing__hint text-sm text-muted-foreground">
        Search for a track or album to start listening together.
      </p>
    </div>
  </section>
</template>
