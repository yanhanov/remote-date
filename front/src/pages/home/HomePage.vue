<script setup lang="ts">
import { RouterLink } from "vue-router";
import { PhArrowUpRight } from "@phosphor-icons/vue";
import YouTubeIcon from "@/shared/ui/icons/YouTubeIcon.vue";
import SoundCloudIcon from "@/shared/ui/icons/SoundCloudIcon.vue";

const platforms = [
  {
    title: "YouTube",
    tagline: "Video rooms",
    description: "Pick a video and watch in perfect sync.",
    icon: YouTubeIcon,
    route: "/youtube",
    iconBg: "bg-[var(--youtube)]/2",
    iconRing: "ring-[var(--youtube)]/20",
    hoverBorder: "hover:border-[var(--youtube)]/30",
    hoverShadow: "hover:shadow-[0_12px_40px_-12px_rgba(255,0,0,0.18)]",
    arrowHover: "group-hover:text-[var(--youtube)]",
  },
  {
    title: "SoundCloud",
    tagline: "Music rooms",
    description: "Queue tracks and listen together live.",
    icon: SoundCloudIcon,
    route: "/soundcloud",
    iconBg: "bg-[var(--soundcloud)]/2",
    iconRing: "ring-[var(--soundcloud)]/20",
    hoverBorder: "hover:border-[var(--soundcloud)]/30",
    hoverShadow: "hover:shadow-[0_12px_40px_-12px_rgba(255,85,0,0.18)]",
    arrowHover: "group-hover:text-[var(--soundcloud)]",
  },
] as const;
</script>

<template>
  <div class="home-page flex min-h-full flex-1 flex-col">
    <div
      class="home-page__center flex flex-1 flex-col items-center justify-center p-6 md:p-10"
    >
      <div class="home-page__container w-full max-w-lg space-y-10">
        <header class="home-page__header space-y-3">
          <p
            class="home-page__eyebrow text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            Watch together
          </p>
          <h1 class="home-page__title page-title text-3xl md:text-[2rem]">
            Remote Date
          </h1>
          <p class="home-page__subtitle page-subtitle max-w-sm">
            Pick a platform, create a room, and share the link with someone
            special.
          </p>
        </header>

        <nav class="home-page__nav flex flex-col gap-3" aria-label="Platforms">
          <RouterLink
            v-for="platform in platforms"
            :key="platform.route"
            :to="platform.route"
            class="home-page__link group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/30"
            :class="[platform.hoverBorder, platform.hoverShadow]"
          >
            <div
              class="home-page__link-inner relative flex items-center gap-4 p-5"
            >
              <span
                class="home-page__link-icon flex size-14 shrink-0 items-center justify-center rounded-xl ring-1"
                :class="[platform.iconBg, platform.iconRing]"
              >
                <component
                  :is="platform.icon"
                  class="home-page__link-icon-svg size-7"
                />
              </span>

              <span class="home-page__link-body min-w-0 flex-1">
                <span
                  class="home-page__link-tagline text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {{ platform.tagline }}
                </span>
                <span
                  class="home-page__link-title mt-0.5 block text-base font-semibold tracking-tight"
                >
                  {{ platform.title }}
                </span>
                <span
                  class="home-page__link-description mt-1 block text-sm leading-snug text-muted-foreground"
                >
                  {{ platform.description }}
                </span>
              </span>

              <span
                class="home-page__link-action flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors group-hover:border-transparent group-hover:bg-background"
                :class="platform.arrowHover"
              >
                <PhArrowUpRight
                  class="size-4 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
                />
              </span>
            </div>
          </RouterLink>
        </nav>
      </div>
    </div>
  </div>
</template>
