<script setup lang="ts">
import { Button } from '@/shared/ui/button'

defineProps<{
  url: string
}>()

const emit = defineEmits<{
  copy: []
}>()
</script>

<template>
  <section class="room-share-card rounded-xl border border-border/60 bg-card/40 p-4">
    <p class="room-share-card__hint mb-3 text-xs text-muted-foreground">
      Share this link to invite others.
    </p>
    <div class="room-share-card__actions flex items-center gap-2">
      <input
        :value="url"
        readonly
        class="room-share-card__input h-9 min-w-0 flex-1 rounded-lg border border-border/60 bg-background/60 px-3 text-sm text-muted-foreground"
      />
      <Button
        class="room-share-card__button h-9 shrink-0 px-4"
        variant="secondary"
        size="sm"
        @click="emit('copy')"
      >
        Copy
      </Button>
    </div>
  </section>
</template>
