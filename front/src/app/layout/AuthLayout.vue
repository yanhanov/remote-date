<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ThemeToggle } from '@/shared/ui/theme-toggle'
</script>
<template>
  <div class="auth-layout flex min-h-screen w-full flex-col bg-background">
    <header
      class="auth-layout__header flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-6"
    >
      <div class="auth-layout__brand flex items-center gap-2.5">
        <span class="auth-layout__logo-mark relative flex size-8 items-center justify-center rounded-md bg-primary">
          <span class="size-2 rounded-full bg-primary-foreground/90" />
          <span class="absolute size-2 translate-x-1 rounded-full border border-primary-foreground/90 bg-transparent" />
        </span>
        <h1 class="auth-layout__title text-sm font-semibold tracking-[-0.02em]">Remote Date</h1>
      </div>
      <ThemeToggle class="auth-layout__theme-toggle" />
    </header>
    <div class="auth-layout__body flex flex-1 flex-col items-center justify-center px-4 py-10">
      <RouterView class="auth-layout__content w-full max-w-md" />
    </div>
  </div>
</template>
