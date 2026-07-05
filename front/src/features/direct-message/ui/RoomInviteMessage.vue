<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { PhTelevisionSimple, PhMusicNotes } from '@phosphor-icons/vue'
import type { RoomInvitePayload } from '@/shared/lib/room-invite-message'
import YouTubeIcon from '@/shared/ui/icons/YouTubeIcon.vue'
import SoundCloudIcon from '@/shared/ui/icons/SoundCloudIcon.vue'

const props = defineProps<{
  invite: RoomInvitePayload
  isOwn?: boolean
  createdAt?: string
}>()

const formattedTime = computed(() => {
  if (!props.createdAt) return ''
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(props.createdAt))
})

const roomPath = computed(() =>
  props.invite.roomType === 'youtube'
    ? `/room/${props.invite.roomId}`
    : `/sound-room/${props.invite.roomId}`,
)

const title = computed(() =>
  props.isOwn ? 'You sent a watch party invite' : 'Watch party invite',
)

const subtitle = computed(() =>
  props.isOwn
    ? `Waiting for them to join your ${props.invite.label.toLowerCase()}`
    : `${props.invite.inviterName} invited you to join`,
)
</script>

<template>
  <article
    class="room-invite-message relative w-full overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card/95 to-card pb-7 shadow-sm"
  >
    <header
      class="room-invite-message__header flex items-center gap-2.5 border-b border-primary/15 bg-primary/5 px-4 py-2.5"
    >
      <span
        class="room-invite-message__badge flex size-7 items-center justify-center rounded-lg bg-primary/15"
      >
        <YouTubeIcon
          v-if="invite.roomType === 'youtube'"
          class="room-invite-message__badge-icon size-4 text-primary"
        />
        <SoundCloudIcon v-else class="room-invite-message__badge-icon size-4 text-primary" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="room-invite-message__eyebrow text-[10px] font-semibold uppercase tracking-wider text-primary">
          {{ invite.label }}
        </p>
        <p class="room-invite-message__title truncate text-sm font-medium">{{ title }}</p>
      </div>
      <PhTelevisionSimple
        v-if="invite.roomType === 'youtube'"
        class="room-invite-message__accent size-4 shrink-0 text-primary/70"
      />
      <PhMusicNotes v-else class="room-invite-message__accent size-4 shrink-0 text-primary/70" />
    </header>

    <div class="room-invite-message__body space-y-3 p-4">
      <p class="room-invite-message__subtitle text-sm text-muted-foreground">
        {{ subtitle }}
      </p>

      <RouterLink
        :to="roomPath"
        class="room-invite-message__join flex h-10 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Join room
      </RouterLink>
    </div>

    <time
      v-if="formattedTime"
      class="room-invite-message__time absolute bottom-2 text-[10px] text-muted-foreground/75"
      :class="isOwn ? 'right-3' : 'left-3'"
    >
      {{ formattedTime }}
    </time>
  </article>
</template>
