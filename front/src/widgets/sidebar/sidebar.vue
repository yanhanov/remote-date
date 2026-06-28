<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import {
  PhHouse,
  PhUsers,
  PhChatCircle,
} from "@phosphor-icons/vue";
import YouTubeIcon from "@/shared/ui/icons/YouTubeIcon.vue";
import SoundCloudIcon from "@/shared/ui/icons/SoundCloudIcon.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/shared/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar";
import { authStore } from "@/entities/user";

const { state, isMobile, openMobile, setOpenMobile } = useSidebar();
const route = useRoute();

const isCollapsed = computed(() => {
  if (isMobile.value) return false;
  return state.value === "collapsed";
});

watch(
  () => route.path,
  () => {
    if (isMobile.value && openMobile.value) {
      setOpenMobile(false);
    }
  },
);

const navButtonClass =
  "app-sidebar__nav-button rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary data-[active=true]:font-medium data-[active=true]:shadow-none group-data-[collapsible=icon]:justify-center";

const profileButtonClass = computed(() =>
  isCollapsed.value
    ? `${navButtonClass} app-sidebar__profile-button app-sidebar__profile-button--collapsed`
    : "app-sidebar__profile-button h-auto min-h-12 rounded-lg py-2.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary data-[active=true]:font-medium data-[active=true]:shadow-none",
);

function isNavActive(url: string): boolean {
  const path = route.path;

  if (url === "/") return path === "/";
  if (url === "/youtube")
    return path === "/youtube" || path.startsWith("/room/");
  if (url === "/soundcloud")
    return path === "/soundcloud" || path.startsWith("/sound-room/");

  return path === url || path.startsWith(`${url}/`);
}

const user = authStore.user;

const displayName = computed(() => {
  if (!user.value) return "Guest";
  if (user.value.firstName && user.value.lastName) {
    return `${user.value.firstName} ${user.value.lastName}`;
  }
  return user.value.email;
});

const avatarInitials = computed(() => {
  if (!user.value) return "G";
  if (user.value.firstName && user.value.lastName) {
    return `${user.value.firstName[0]}${user.value.lastName[0]}`.toUpperCase();
  }
  return user.value.email?.[0]?.toUpperCase() || "";
});

const mainItems = [
  { title: "Home", url: "/", icon: PhHouse },
  { title: "YouTube", url: "/youtube", icon: YouTubeIcon },
  { title: "SoundCloud", url: "/soundcloud", icon: SoundCloudIcon },
];

const secondaryItems = [
  { title: "Friends", url: "/friends", icon: PhUsers },
  { title: "Messages", url: "/messages", icon: PhChatCircle },
];
</script>

<template>
  <Sidebar
    collapsible="icon"
    variant="sidebar"
    class="app-sidebar border-r border-sidebar-border bg-sidebar shadow-none"
  >
    <div
      class="app-sidebar__inner flex h-full min-w-0 flex-col overflow-x-hidden"
      :class="{ 'app-sidebar--collapsed': isCollapsed }"
    >
      <SidebarHeader
        class="app-sidebar__header border-0"
        :class="isCollapsed ? 'items-center px-0 py-3' : 'px-3 py-4'"
      >
        <RouterLink
          to="/"
          class="app-sidebar__logo flex items-center rounded-lg text-foreground transition-opacity hover:opacity-80"
          :class="isCollapsed ? 'justify-center' : 'gap-2.5 px-1 py-1'"
        >
          <span
            class="app-sidebar__logo-mark flex shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-semibold tracking-tight text-sidebar-primary-foreground"
            :class="isCollapsed ? 'size-9 text-xs' : 'size-8 text-[11px]'"
          >
            R
          </span>
          <span
            v-if="!isCollapsed"
            class="app-sidebar__logo-text truncate text-sm font-semibold tracking-tight"
          >
            Remote
          </span>
        </RouterLink>
      </SidebarHeader>

      <SidebarContent
        class="app-sidebar__content min-h-0 flex-1 overflow-x-hidden!"
        :class="isCollapsed ? 'gap-1 px-1.5' : 'gap-0 px-2'"
      >
        <SidebarGroup class="app-sidebar__group app-sidebar__group--main py-0">
          <SidebarGroupContent
            class="app-sidebar__group-content overflow-x-hidden"
          >
            <SidebarMenu
              class="app-sidebar__menu"
              :class="isCollapsed ? 'gap-1.5' : 'gap-1'"
            >
              <SidebarMenuItem
                v-for="item in mainItems"
                :key="item.title"
                class="app-sidebar__nav-item"
              >
                <SidebarMenuButton
                  as-child
                  :tooltip="item.title"
                  :is-active="isNavActive(item.url)"
                  :class="navButtonClass"
                >
                  <RouterLink
                    :to="item.url"
                    class="app-sidebar__nav-link flex items-center"
                    :class="[
                      isCollapsed ? 'justify-center' : 'gap-2',
                      {
                        'app-sidebar__nav-link--active': isNavActive(item.url),
                      },
                    ]"
                  >
                    <component
                      :is="item.icon"
                      class="app-sidebar__nav-icon size-[18px] shrink-0 opacity-80"
                    />
                    <span v-if="!isCollapsed" class="app-sidebar__nav-label">
                      {{ item.title }}
                    </span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator
          v-if="!isCollapsed"
          class="app-sidebar__separator my-3 bg-border/60"
        />

        <SidebarGroup
          class="app-sidebar__group app-sidebar__group--secondary py-0"
        >
          <SidebarGroupContent class="app-sidebar__group-content">
            <SidebarMenu
              class="app-sidebar__menu"
              :class="isCollapsed ? 'gap-1.5' : 'gap-1'"
            >
              <SidebarMenuItem
                v-for="item in secondaryItems"
                :key="item.title"
                class="app-sidebar__nav-item"
              >
                <SidebarMenuButton
                  as-child
                  :tooltip="item.title"
                  :is-active="isNavActive(item.url)"
                  :class="navButtonClass"
                >
                  <RouterLink
                    :to="item.url"
                    class="app-sidebar__nav-link flex items-center"
                    :class="[
                      isCollapsed ? 'justify-center' : 'gap-2',
                      {
                        'app-sidebar__nav-link--active': isNavActive(item.url),
                      },
                    ]"
                  >
                    <component
                      :is="item.icon"
                      class="app-sidebar__nav-icon size-[18px] shrink-0 opacity-70"
                    />
                    <span v-if="!isCollapsed" class="app-sidebar__nav-label">
                      {{ item.title }}
                    </span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        class="app-sidebar__footer mt-auto shrink-0 border-0"
        :class="
          isCollapsed
            ? 'flex justify-center overflow-x-hidden border-t-0 p-1.5 pt-2'
            : 'border-t border-border/60 p-2 pt-3'
        "
      >
        <SidebarMenu
          class="app-sidebar__menu app-sidebar__menu--profile"
          :class="{ 'w-full': !isCollapsed }"
        >
          <SidebarMenuItem
            class="app-sidebar__nav-item app-sidebar__nav-item--profile"
          >
            <SidebarMenuButton
              as-child
              :size="isCollapsed ? 'default' : 'lg'"
              tooltip="Profile"
              :is-active="isNavActive('/profile')"
              :class="profileButtonClass"
            >
              <RouterLink
                to="/profile"
                class="app-sidebar__profile flex items-center"
                :class="[
                  isCollapsed ? 'size-10 justify-center' : 'w-full gap-3',
                  { 'app-sidebar__profile--active': isNavActive('/profile') },
                ]"
              >
                <Avatar
                  class="app-sidebar__profile-avatar shrink-0"
                  :class="isCollapsed ? 'size-8' : 'size-9'"
                >
                  <AvatarImage :src="user?.avatarUrl || ''" />
                  <AvatarFallback
                    class="app-sidebar__profile-fallback bg-primary/10 font-medium text-primary"
                    :class="isCollapsed ? 'text-[10px]' : 'text-xs'"
                  >
                    {{ avatarInitials }}
                  </AvatarFallback>
                </Avatar>
                <div
                  v-if="!isCollapsed"
                  class="app-sidebar__profile-info min-w-0 flex-1 text-left"
                >
                  <p
                    class="app-sidebar__profile-name truncate text-sm font-medium leading-5 text-foreground"
                  >
                    {{ displayName }}
                  </p>
                  <p
                    class="app-sidebar__profile-email truncate text-xs leading-4 text-muted-foreground"
                  >
                    {{ user?.email }}
                  </p>
                </div>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </div>
  </Sidebar>
</template>

<style scoped>
.app-sidebar--collapsed :deep(.app-sidebar__nav-button) {
  width: 2.5rem;
  height: 2.5rem;
  min-width: 2.5rem;
  padding: 0;
  margin-inline: auto;
}

.app-sidebar--collapsed :deep(.app-sidebar__profile-button) {
  width: 2.5rem;
  height: 2.5rem;
  min-height: 2.5rem;
  min-width: 2.5rem;
  padding: 0;
  margin-inline: auto;
  overflow: visible;
}

.app-sidebar--collapsed :deep(.app-sidebar__profile-button--collapsed) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-sidebar--collapsed :deep(.app-sidebar__nav-item--profile) {
  display: flex;
  justify-content: center;
  width: 100%;
}

.app-sidebar--collapsed :deep(.app-sidebar__menu--profile) {
  align-items: center;
  width: 100%;
}

.app-sidebar--collapsed :deep(.app-sidebar__nav-item) {
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.app-sidebar--collapsed :deep(.app-sidebar__menu) {
  overflow-x: hidden;
}
</style>
