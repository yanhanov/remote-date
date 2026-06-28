<script setup lang="ts">
import { PhChatCircle } from '@phosphor-icons/vue'
</script>

<template>
  <div class="messages-page flex flex-1 flex-col items-center justify-center p-6">
    <div class="messages-page__container w-full max-w-sm space-y-3 text-center">
      <span
        class="messages-page__icon mx-auto flex size-12 items-center justify-center rounded-xl border border-border/60 bg-card/40"
      >
        <PhChatCircle class="size-6 text-muted-foreground" />
      </span>
      <h1 class="messages-page__title text-2xl font-semibold tracking-tight">Messages</h1>
      <p class="messages-page__subtitle text-sm text-muted-foreground">
        Direct messages outside rooms. Coming soon.
      </p>
    </div>
  </div>
</template>
