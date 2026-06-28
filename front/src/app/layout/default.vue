<script setup lang="ts">
import { Sidebar } from "@/widgets";
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
    <div class="app-layout flex min-h-screen w-full">
      <Sidebar />

      <SidebarInset class="app-layout__main">
        <header
          class="app-layout__header flex justify-between md:h-14 h-12 shrink-0 items-center gap-2 px-4"
        >
          <SidebarTrigger class="app-layout__sidebar-trigger -ml-1" />
          <ThemeToggle class="app-layout__theme-toggle" />
        </header>
        <div class="app-layout__body flex flex-1 flex-col">
          <RouterView class="app-layout__content flex-1" />
        </div>
      </SidebarInset>
    </div>
  </SidebarProvider>
</template>
