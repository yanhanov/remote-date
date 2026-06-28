<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { PhArrowRight } from '@phosphor-icons/vue'
import YouTubeIcon from '@/shared/ui/icons/YouTubeIcon.vue'
import SoundCloudIcon from '@/shared/ui/icons/SoundCloudIcon.vue'

const platforms = [
  {
    title: 'YouTube',
    description: 'Create a room and pick a video inside.',
    icon: YouTubeIcon,
    route: '/youtube',
  },
  {
    title: 'SoundCloud',
    description: 'Create a room and pick a track inside.',
    icon: SoundCloudIcon,
    route: '/soundcloud',
  },
] as const
</script>

<template>
  <div class="home-page flex flex-1 flex-col items-center justify-center p-6">
    <div class="home-page__container w-full max-w-md space-y-8">
      <header class="home-page__header space-y-1.5 text-center">
        <div class="home-page__brand flex items-center justify-center gap-2.5">
          <span
            class="home-page__logo-mark flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-semibold tracking-tight text-primary-foreground"
          >
            R
          </span>
          <h1 class="home-page__title text-2xl font-semibold tracking-tight">
            Remote Date
          </h1>
        </div>
        <p class="home-page__subtitle text-sm text-muted-foreground">
          Choose a platform to create or join a room.
        </p>
      </header>

      <nav class="home-page__nav space-y-2" aria-label="Platforms">
        <RouterLink
          v-for="platform in platforms"
          :key="platform.route"
          :to="platform.route"
          class="home-page__link group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:bg-accent/50"
        >
          <span
            class="home-page__link-icon flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50"
          >
            <component
              :is="platform.icon"
              class="home-page__link-icon-svg size-5 opacity-90"
            />
          </span>

          <span class="home-page__link-body min-w-0 flex-1">
            <span class="home-page__link-title block text-sm font-medium">
              {{ platform.title }}
            </span>
            <span class="home-page__link-description mt-0.5 block text-sm text-muted-foreground">
              {{ platform.description }}
            </span>
          </span>

          <PhArrowRight
            class="home-page__link-arrow size-4 shrink-0 text-primary opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
