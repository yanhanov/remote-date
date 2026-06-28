<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { getUserInitials } from '@/shared/api/social.api'
import type { PublicUserSummary } from '@/shared/api/social.types'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(
  defineProps<{
    user: Pick<PublicUserSummary, 'displayName' | 'firstName' | 'lastName' | 'userId' | 'avatarUrl'>
    size?: 'sm' | 'md' | 'lg' | 'xl'
    class?: string
  }>(),
  { size: 'md' },
)

const sizeClass = {
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-24 text-xl',
  xl: 'size-32 text-2xl',
}[props.size]
</script>

<template>
  <Avatar :class="cn('user-avatar shrink-0', sizeClass, props.class)">
    <AvatarImage :src="user.avatarUrl || ''" :alt="user.displayName" />
    <AvatarFallback class="user-avatar__fallback bg-primary/10 font-medium text-primary">
      {{ getUserInitials(user) }}
    </AvatarFallback>
  </Avatar>
</template>
