<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { PhSpinner, PhPlus, PhLinkSimple } from '@phosphor-icons/vue'
import { LastRoomCard, useLastRoom } from '@/entities/room'
import { roomAPI } from '@/shared/api/room.api'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { platforms, type PlatformId } from '../model/platforms'

const props = defineProps<{
  platform: PlatformId
}>()

const router = useRouter()
const platformConfig = platforms[props.platform]

const roomIdToJoin = ref('')
const createLoading = ref(false)
const joinLoading = ref(false)
const createError = ref<string | null>(null)
const joinError = ref<string | null>(null)

const { lastRoom, loading: lastRoomLoading } = useLastRoom(platformConfig.roomType)

async function createRoom() {
  createLoading.value = true
  createError.value = null

  try {
    const room = await roomAPI.createRoom({ type: platformConfig.roomType })
    router.push(platformConfig.roomPath(room.id))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create room'
    createError.value = message
    toast.error(message)
  } finally {
    createLoading.value = false
  }
}

async function joinRoom() {
  const id = roomIdToJoin.value.trim()
  if (!id) {
    joinError.value = 'Please enter a room ID'
    toast.error('Please enter a room ID')
    return
  }

  joinLoading.value = true
  joinError.value = null

  try {
    const room = await roomAPI.getRoom(id)
    if (room.type !== platformConfig.roomType) {
      const message = `This is not a ${platformConfig.title} room`
      joinError.value = message
      toast.error(message)
      return
    }
    router.push(platformConfig.roomPath(id))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Room not found'
    joinError.value = message
    toast.error(message)
  } finally {
    joinLoading.value = false
  }
}
</script>

<template>
  <div
    class="platform-room-hub flex flex-1 flex-col items-center justify-center p-6 md:p-10"
    :class="`platform-room-hub--${platform}`"
  >
    <div class="platform-room-hub__container w-full max-w-md space-y-8">
      <header class="platform-room-hub__header space-y-3">
        <p
          class="platform-room-hub__eyebrow text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          {{ platformConfig.tagline }}
        </p>
        <div class="platform-room-hub__brand flex items-center gap-4">
          <span
            class="platform-room-hub__icon flex size-14 shrink-0 items-center justify-center rounded-xl ring-1"
            :class="[platformConfig.iconBg, platformConfig.iconRing]"
          >
            <component :is="platformConfig.icon" class="size-7" />
          </span>
          <div class="min-w-0">
            <h1 class="platform-room-hub__title page-title text-3xl md:text-[2rem]">
              {{ platformConfig.title }}
            </h1>
            <p class="platform-room-hub__subtitle page-subtitle mt-1">
              {{ platformConfig.description }}
            </p>
          </div>
        </div>
      </header>

      <div class="platform-room-hub__actions space-y-5">
        <LastRoomCard
          v-if="lastRoom && !lastRoomLoading"
          class="platform-room-hub__last-room"
          :room="lastRoom"
          :room-type="platformConfig.roomType"
        />

        <div class="platform-room-hub__create-block space-y-2">
          <button
            type="button"
            class="platform-room-hub__create flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
            :class="[platformConfig.brandButton, platformConfig.brandButtonShadow]"
            :disabled="createLoading"
            @click="createRoom"
          >
            <PhSpinner v-if="createLoading" class="size-4 animate-spin" />
            <PhPlus v-else class="size-4" weight="bold" />
            {{ createLoading ? 'Creating...' : 'Create room' }}
          </button>
          <p class="platform-room-hub__create-hint text-center text-xs text-muted-foreground">
            {{ platformConfig.createDescription }}
          </p>
        </div>

        <div class="platform-room-hub__divider relative py-1">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-border/70" />
          </div>
          <div class="relative flex justify-center">
            <span class="bg-background px-3 text-xs font-medium text-muted-foreground">or</span>
          </div>
        </div>

        <section
          class="platform-room-hub__join rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur-sm"
        >
          <div class="platform-room-hub__join-header mb-3">
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Have an invite?
            </p>
            <h2 class="mt-0.5 text-sm font-semibold tracking-tight">Join by room ID</h2>
          </div>

          <div class="platform-room-hub__join-row flex gap-2">
            <div class="relative min-w-0 flex-1">
              <PhLinkSimple
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                :id="`${platform}-room-id`"
                v-model="roomIdToJoin"
                class="platform-room-hub__join-input h-11 rounded-xl border-border/80 bg-background pl-9 shadow-none"
                type="text"
                placeholder="Paste room ID"
                :disabled="joinLoading"
                @keyup.enter="joinRoom"
              />
            </div>

            <Button
              class="platform-room-hub__join-submit h-11 shrink-0 rounded-xl border-2 px-5 font-medium transition-colors"
              variant="outline"
              :class="platformConfig.brandJoinButton"
              :disabled="joinLoading"
              @click="joinRoom"
            >
              {{ joinLoading ? '...' : 'Join' }}
            </Button>
          </div>

          <p v-if="joinError" class="platform-room-hub__error mt-2 text-xs text-destructive">
            {{ joinError }}
          </p>
          <p v-else-if="createError" class="platform-room-hub__error mt-2 text-xs text-destructive">
            {{ createError }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
