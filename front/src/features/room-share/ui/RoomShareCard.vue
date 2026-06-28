<script setup lang="ts">
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'

defineProps<{
  url: string
}>()

const emit = defineEmits<{
  copy: []
}>()
</script>

<template>
  <Card class="room-share-card">
    <CardContent class="room-share-card__content p-4">
      <p class="room-share-card__hint text-sm text-muted-foreground">
        Share this room with others to watch together!
      </p>
      <div class="room-share-card__actions mt-2 flex items-center gap-2">
        <input
          :value="url"
          readonly
          class="room-share-card__input flex-1 px-3 py-2 border rounded-md text-sm"
        />
        <Button class="room-share-card__button" size="sm" @click="emit('copy')">
          Copy Link
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
