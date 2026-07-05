<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { UserAvatar } from '@/entities/user'
import type { PublicUserSummary } from '@/shared/api/social.types'
import { cn } from '@/shared/lib/utils'

defineProps<{
  user: Pick<
    PublicUserSummary,
    'userId' | 'displayName' | 'avatarUrl' | 'username' | 'firstName' | 'lastName'
  >
  subtitle?: string
  variant?: 'default' | 'incoming' | 'pending'
}>()
</script>

<template>
  <article
    class="friends-member-card flex items-center gap-3 rounded-xl border border-border/70 p-4 transition-colors hover:bg-accent/30"
    :class="
      cn(
        variant === 'incoming' && 'border-primary/30 bg-primary/6',
        variant === 'pending' && 'bg-card/50 backdrop-blur-sm',
        (!variant || variant === 'default') && 'bg-card/50 backdrop-blur-sm',
      )
    "
  >
    <RouterLink
      :to="`/users/${user.userId}`"
      class="friends-member-card__profile flex min-w-0 flex-1 items-center gap-3"
    >
      <UserAvatar :user="user" size="sm" class="friends-member-card__avatar" />
      <div class="friends-member-card__info min-w-0">
        <p class="friends-member-card__name truncate text-sm font-medium leading-tight">
          {{ user.displayName }}
        </p>
        <p
          v-if="subtitle || user.username"
          class="friends-member-card__meta mt-0.5 truncate text-xs text-muted-foreground"
        >
          {{ subtitle ?? (user.username ? `@${user.username}` : '') }}
        </p>
      </div>
    </RouterLink>

    <div
      v-if="$slots.actions"
      class="friends-member-card__actions flex shrink-0 items-center gap-1.5"
    >
      <slot name="actions" />
    </div>
  </article>
</template>
