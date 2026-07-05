<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { PhHouse, PhUsers, PhChatCircle, PhSidebarSimple } from "@phosphor-icons/vue";
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
  useSidebar,
} from "@/shared/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar";
import { authStore } from "@/entities/user";
import { cn } from "@/shared/lib/utils";

import { useAppNav } from "@/widgets/app-nav/use-app-nav";

const { isMobile, openMobile, setOpenMobile, state, setOpen } = useSidebar();
const route = useRoute();
const { isNavActive } = useAppNav();

const collapseSync =
  "transition-all duration-200 ease-linear group-data-[collapsible=icon]:duration-200 group-data-[collapsible=icon]:ease-linear";

watch(
  () => route.path,
  () => {
    if (isMobile.value && openMobile.value) {
      setOpenMobile(false);
    }
  },
);

function navClass(active: boolean) {
  return cn(
    "app-sidebar__nav-button h-10 w-full rounded-xl text-sm font-medium shadow-none",
    collapseSync,
    "hover:bg-accent/50 hover:text-foreground",
    "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:shadow-none",
    "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!min-h-10 group-data-[collapsible=icon]:!p-0",
    !active && "text-muted-foreground",
  );
}

const labelHide = cn(
  collapseSync,
  "overflow-hidden whitespace-nowrap",
  "group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0",
);

const sectionLabelClass = cn(
  "app-sidebar__label mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
  collapseSync,
  "overflow-hidden",
  "group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:max-h-0 group-data-[collapsible=icon]:opacity-0",
);

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

const watchItems = [
  { title: "Home", url: "/", icon: PhHouse },
  { title: "YouTube", url: "/youtube", icon: YouTubeIcon },
  { title: "SoundCloud", url: "/soundcloud", icon: SoundCloudIcon },
];

const socialItems = [
  { title: "Friends", url: "/friends", icon: PhUsers },
  { title: "Messages", url: "/messages", icon: PhChatCircle },
];

function onLogoClick(event: MouseEvent) {
  if (isMobile.value || state.value === "expanded") return;

  event.preventDefault();
  setOpen(true);
}
</script>

<template>
  <Sidebar collapsible="icon" class="app-sidebar border-r border-border/60 bg-background">
    <SidebarHeader
      class="app-sidebar__header p-3 group-data-[collapsible=icon]:px-2"
      :class="collapseSync"
    >
      <RouterLink
        to="/"
        class="app-sidebar__logo group/logo flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl p-2 hover:bg-accent/40"
        :class="[
          collapseSync,
          'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0',
        ]"
        :aria-label="state === 'collapsed' && !isMobile ? 'Expand sidebar' : 'Remote Date home'"
        @click="onLogoClick"
      >
        <span
          class="app-sidebar__logo-icon relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"
        >
          <span
            class="flex items-center justify-center transition-opacity duration-200 group-data-[collapsible=icon]:group-hover/logo:opacity-0"
          >
            <span class="size-2 rounded-full bg-current" />
          </span>
          <PhSidebarSimple
            class="absolute size-5 opacity-0 transition-opacity duration-200 group-data-[collapsible=icon]:group-hover/logo:opacity-100"
            weight="bold"
            aria-hidden="true"
          />
        </span>
        <span
          class="app-sidebar__logo-text truncate text-sm font-semibold tracking-tight"
          :class="labelHide"
        >
          Remote Date
        </span>
      </RouterLink>
    </SidebarHeader>

    <SidebarContent
      class="app-sidebar__content gap-4 overflow-hidden px-2 group-data-[collapsible=icon]:gap-2"
      :class="collapseSync"
    >
      <SidebarGroup class="app-sidebar__group app-sidebar__group--watch p-0">
        <p :class="sectionLabelClass">Watch</p>
        <SidebarGroupContent>
          <SidebarMenu class="app-sidebar__menu gap-1">
            <SidebarMenuItem
              v-for="item in watchItems"
              :key="item.url"
              class="app-sidebar__nav-item group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
            >
              <SidebarMenuButton
                as-child
                :tooltip="item.title"
                :is-active="isNavActive(item.url)"
                :class="navClass(isNavActive(item.url))"
              >
                <RouterLink
                  :to="item.url"
                  class="app-sidebar__nav-link flex w-full min-w-0 items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                  :class="collapseSync"
                >
                  <component :is="item.icon" class="size-[18px] shrink-0" />
                  <span :class="labelHide">{{ item.title }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup class="app-sidebar__group app-sidebar__group--social p-0">
        <p :class="sectionLabelClass">Social</p>
        <SidebarGroupContent>
          <SidebarMenu class="app-sidebar__menu gap-1">
            <SidebarMenuItem
              v-for="item in socialItems"
              :key="item.url"
              class="app-sidebar__nav-item group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
            >
              <SidebarMenuButton
                as-child
                :tooltip="item.title"
                :is-active="isNavActive(item.url)"
                :class="navClass(isNavActive(item.url))"
              >
                <RouterLink
                  :to="item.url"
                  class="app-sidebar__nav-link flex w-full min-w-0 items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                  :class="collapseSync"
                >
                  <component :is="item.icon" class="size-[18px] shrink-0" />
                  <span :class="labelHide">{{ item.title }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="app-sidebar__footer p-2 group-data-[collapsible=icon]:px-1.5">
      <SidebarMenu>
        <SidebarMenuItem
          class="app-sidebar__nav-item app-sidebar__nav-item--profile group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
        >
          <SidebarMenuButton
            as-child
            tooltip="Profile"
            :is-active="isNavActive('/profile')"
            :class="
              cn(
                navClass(isNavActive('/profile')),
                'app-sidebar__profile-button !h-auto min-h-11 !rounded-2xl border border-border/50 !bg-card/60 !py-2 backdrop-blur-sm',
                'group-data-[collapsible=icon]:!border-transparent group-data-[collapsible=icon]:!bg-transparent group-data-[collapsible=icon]:!shadow-none',
              )
            "
          >
            <RouterLink
              to="/profile"
              class="app-sidebar__profile flex w-full min-w-0 items-center gap-3 overflow-hidden px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              :class="collapseSync"
            >
              <Avatar class="size-8 shrink-0">
                <AvatarImage :src="user?.avatarUrl || ''" />
                <AvatarFallback
                  class="bg-primary/10 text-xs font-medium text-primary"
                >
                  {{ avatarInitials }}
                </AvatarFallback>
              </Avatar>
              <div
                class="min-w-0 flex-1 overflow-hidden text-left"
                :class="labelHide"
              >
                <p class="truncate text-sm font-medium">{{ displayName }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ user?.email }}
                </p>
              </div>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
