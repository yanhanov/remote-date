<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { PhHouse, PhUsers, PhChatCircle, PhUser } from '@phosphor-icons/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { authStore } from '@/entities/user'
import { cn } from '@/shared/lib/utils'
import { useAppNav } from '@/widgets/app-nav/use-app-nav'

const { isNavActive } = useAppNav()
const user = authStore.user

const items = [
  { title: 'Home', url: '/', icon: PhHouse },
  { title: 'Friends', url: '/friends', icon: PhUsers },
  { title: 'Messages', url: '/messages', icon: PhChatCircle },
  { title: 'Profile', url: '/profile', icon: PhUser, isProfile: true as const },
]

const avatarInitials = computed(() => {
  if (!user.value) return 'U'
  if (user.value.firstName && user.value.lastName) {
    return `${user.value.firstName[0]}${user.value.lastName[0]}`.toUpperCase()
  }
  return user.value.email?.[0]?.toUpperCase() || 'U'
})

function itemClass(active: boolean) {
  return cn(
    'mobile-nav__link flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors',
    active ? 'text-primary' : 'text-muted-foreground',
  )
}
</script>

<template>
  <nav
    class="mobile-nav fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    aria-label="Main navigation"
  >
    <div class="mobile-nav__inner flex items-stretch justify-around gap-1 px-2 pt-1.5">
      <RouterLink
        v-for="item in items"
        :key="item.url"
        :to="item.url"
        :class="itemClass(isNavActive(item.url))"
        :aria-current="isNavActive(item.url) ? 'page' : undefined"
      >
        <Avatar
          v-if="'isProfile' in item"
          class="mobile-nav__avatar size-6"
          :class="isNavActive(item.url) && 'ring-2 ring-primary/30'"
        >
          <AvatarImage :src="user?.avatarUrl || ''" />
          <AvatarFallback class="bg-primary/10 text-[9px] font-medium text-primary">
            {{ avatarInitials }}
          </AvatarFallback>
        </Avatar>
        <component
          :is="item.icon"
          v-else
          class="mobile-nav__icon size-6 shrink-0"
          :weight="isNavActive(item.url) ? 'fill' : 'regular'"
        />
        <span class="mobile-nav__label truncate">{{ item.title }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
