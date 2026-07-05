<script setup lang="ts">
import { PhCheck, PhClock } from "@phosphor-icons/vue";
import type { DirectMessageStatus } from "@/shared/api/social.types";
import { cn } from "@/shared/lib/utils";

defineProps<{
  status?: DirectMessageStatus;
}>();
</script>

<template>
  <span
    class="message-status inline-flex items-center"
    :class="
      cn(
        'message-status--' + (status ?? 'sent'),
        status === 'read' && 'text-primary-foreground/80',
        status === 'delivered' && 'text-primary-foreground/80',
        status === 'sent' && 'text-primary-foreground/55',
        status === 'sending' && 'text-primary-foreground/55',
      )
    "
    :title="
      status === 'sending'
        ? 'Sending'
        : status === 'sent'
          ? 'Sent'
          : status === 'delivered'
            ? 'Delivered'
            : 'Read'
    "
  >
    <PhClock v-if="status === 'sending'" class="size-3 animate-pulse" />
    <PhCheck
      v-else-if="status === 'sent' || status === 'delivered'"
      class="size-3"
      weight="bold"
    />
    <span
      v-else-if="status === 'read'"
      class="message-status__checks relative inline-flex w-4 items-center"
    >
      <PhCheck class="size-3 shrink-0" weight="bold" />
      <PhCheck class="absolute left-1.5 size-3 shrink-0" weight="bold" />
    </span>
  </span>
</template>
