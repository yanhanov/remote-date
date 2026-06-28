<script setup lang="ts">
import { PhUsers } from '@phosphor-icons/vue'
</script>

<template>
  <div class="friends-page flex flex-1 flex-col items-center justify-center p-6">
    <div class="friends-page__container w-full max-w-sm space-y-3 text-center">
      <span
        class="friends-page__icon mx-auto flex size-12 items-center justify-center rounded-xl border border-border/60 bg-card/40"
      >
        <PhUsers class="size-6 text-muted-foreground" />
      </span>
      <h1 class="friends-page__title text-2xl font-semibold tracking-tight">Friends</h1>
      <p class="friends-page__subtitle text-sm text-muted-foreground">
        Find people and watch together. Coming soon.
      </p>
    </div>
  </div>
</template>
