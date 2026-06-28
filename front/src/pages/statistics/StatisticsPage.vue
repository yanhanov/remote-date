<script setup lang="ts">
import { PhChartBar } from '@phosphor-icons/vue'
</script>

<template>
  <div class="statistics-page flex flex-1 flex-col items-center justify-center p-6">
    <div class="statistics-page__container w-full max-w-sm space-y-3 text-center">
      <span
        class="statistics-page__icon mx-auto flex size-12 items-center justify-center rounded-xl border border-border/60 bg-card/40"
      >
        <PhChartBar class="size-6 text-muted-foreground" />
      </span>
      <h1 class="statistics-page__title text-2xl font-semibold tracking-tight">Statistics</h1>
      <p class="statistics-page__subtitle text-sm text-muted-foreground">
        Room activity and listening stats. Coming soon.
      </p>
    </div>
  </div>
</template>
