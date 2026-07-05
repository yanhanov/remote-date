<script setup lang="ts">
import { Sidebar, AppBreadcrumbs, MobileNav } from "@/widgets";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/ui/sidebar";
import { RouterView } from "vue-router";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
</script>
<template>
  <SidebarProvider>
    <div class="app-layout flex h-svh w-full overflow-hidden">
      <Sidebar />

      <SidebarInset class="app-layout__main min-h-0 overflow-hidden">
        <header
          class="app-layout__header flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-background/80 px-4 backdrop-blur-sm md:h-14"
        >
          <div
            class="app-layout__header-start flex min-w-0 flex-1 items-center gap-2"
          >
            <SidebarTrigger
              class="app-layout__sidebar-trigger -ml-1 hidden shrink-0 md:inline-flex"
            />
            <AppBreadcrumbs class="app-layout__breadcrumbs min-w-0" />
          </div>
          <ThemeToggle class="app-layout__theme-toggle shrink-0" />
        </header>
        <div class="app-layout__body flex min-h-0 flex-1 flex-col overflow-hidden">
          <RouterView
            class="app-layout__content flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
          />
        </div>
      </SidebarInset>

      <MobileNav />
    </div>
  </SidebarProvider>
</template>
