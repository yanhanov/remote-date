<script setup lang="ts">
import { computed } from 'vue'
import { splitMessageLinks } from '@/shared/lib/format-message-links'

const props = defineProps<{
  text: string
}>()

const segments = computed(() => splitMessageLinks(props.text))
</script>

<template>
  <span class="message-text">
    <template v-for="(segment, index) in segments" :key="index">
      <a
        v-if="segment.type === 'link'"
        :href="segment.href"
        class="message-text__link underline underline-offset-2 hover:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >
        {{ segment.value }}
      </a>
      <template v-else>{{ segment.value }}</template>
    </template>
  </span>
</template>
