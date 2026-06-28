<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { PhGear, PhUser, PhCaretRight } from '@phosphor-icons/vue'
import { ThemeToggle } from '@/shared/ui/theme-toggle'
</script>

<template>
  <div class="settings-page mx-auto w-full max-w-lg flex-1 p-6 md:p-8">
    <header class="settings-page__header mb-6 space-y-1">
      <h1 class="settings-page__title text-2xl font-semibold tracking-tight">Settings</h1>
      <p class="settings-page__subtitle text-sm text-muted-foreground">
        App preferences and account.
      </p>
    </header>

    <section class="settings-page__section space-y-2">
      <RouterLink
        to="/profile"
        class="settings-page__link group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-muted/30"
      >
        <span
          class="settings-page__link-icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50"
        >
          <PhUser class="size-4 text-muted-foreground" />
        </span>
        <span class="settings-page__link-body min-w-0 flex-1 text-left">
          <span class="settings-page__link-title block text-sm font-medium">Profile</span>
          <span class="settings-page__link-description text-xs text-muted-foreground">
            Name, avatar, personal info
          </span>
        </span>
        <PhCaretRight
          class="settings-page__link-arrow size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </RouterLink>

      <div
        class="settings-page__row flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-4"
      >
        <div class="settings-page__row-body flex items-center gap-3">
          <span
            class="settings-page__row-icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50"
          >
            <PhGear class="size-4 text-muted-foreground" />
          </span>
          <div>
            <p class="settings-page__row-title text-sm font-medium">Theme</p>
            <p class="settings-page__row-description text-xs text-muted-foreground">
              Light or dark mode
            </p>
          </div>
        </div>
        <ThemeToggle class="settings-page__theme-toggle" />
      </div>
    </section>
  </div>
</template>
