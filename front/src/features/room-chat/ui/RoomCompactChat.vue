<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { PhChatsTeardrop, PhPaperPlaneRight, PhMinus } from '@phosphor-icons/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { ChatMessage } from '@/shared/api/chat.types'
import { useFloatingPanel } from '../model/use-floating-panel'

type UiChatMessage = ChatMessage & {
  isOwn?: boolean
  imageUrl?: string
}

const props = defineProps<{
  messages: UiChatMessage[]
  newMessage: string
  currentUserName?: string | null
  theater?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:newMessage', value: string): void
  (e: 'send'): void
}>()

const ICON_SIZE = 44

const containerRef = useTemplateRef<HTMLElement>('containerRef')
const messagesRef = useTemplateRef<HTMLElement>('messagesRef')
const isMinimized = useLocalStorage('room-compact-chat:minimized', false)

const { x, y, width, height, ensureDefaultPosition, clampPosition, startDrag, startResize } =
  useFloatingPanel(containerRef, {
    storageKey: 'room-compact-chat',
    defaultWidth: 300,
    defaultHeight: 260,
    minWidth: 200,
    minHeight: 160,
  })

const sortedMessages = computed(() =>
  [...props.messages].sort((a, b) => a.time - b.time),
)

const panelClass = computed(() =>
  props.theater
    ? 'border-white/15 bg-zinc-950/90'
    : 'border-border/60 bg-card/95',
)

function isOwnMessage(msg: UiChatMessage) {
  return Boolean(
    msg.author && props.currentUserName && msg.author === props.currentUserName,
  )
}

function messagePreview(msg: UiChatMessage) {
  if (msg.text) return msg.text
  if (msg.trackUrl) return '▶ Track'
  if (msg.imageUrl) return '📷 Image'
  return ''
}

function scrollToBottom() {
  const el = messagesRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function minimize() {
  clampPosition(ICON_SIZE, ICON_SIZE)
  isMinimized.value = true
}

function openPanel() {
  isMinimized.value = false
  nextTick(() => {
    ensureDefaultPosition()
    scrollToBottom()
  })
}

function onIconPointerDown(event: PointerEvent) {
  startDrag(event, {
    width: ICON_SIZE,
    height: ICON_SIZE,
    onEnd: (moved) => {
      if (!moved) openPanel()
    },
  })
}

watch(
  sortedMessages,
  async () => {
    if (isMinimized.value) return
    await nextTick()
    scrollToBottom()
  },
  { deep: true },
)

watch(containerRef, (el) => {
  if (!el) return
  if (isMinimized.value) {
    ensureDefaultPosition(ICON_SIZE, ICON_SIZE)
    return
  }
  ensureDefaultPosition()
})

watch(isMinimized, (minimized) => {
  if (minimized) {
    clampPosition(ICON_SIZE, ICON_SIZE)
    return
  }
  nextTick(() => {
    ensureDefaultPosition()
    scrollToBottom()
  })
})
</script>

<template>
  <div ref="containerRef" class="room-compact-chat pointer-events-none absolute inset-0 z-20 overflow-hidden">
    <button
      v-if="isMinimized"
      type="button"
      class="room-compact-chat__fab pointer-events-auto absolute flex size-11 cursor-grab items-center justify-center rounded-full border shadow-lg backdrop-blur-md active:cursor-grabbing"
      :class="
        theater
          ? 'border-white/15 bg-zinc-950/90 text-white hover:bg-zinc-900'
          : 'border-border/60 bg-card/95 text-foreground hover:bg-muted/50'
      "
      :style="{ left: `${x}px`, top: `${y}px` }"
      aria-label="Open chat"
      @pointerdown="onIconPointerDown"
    >
      <PhChatsTeardrop class="size-5" weight="fill" />
    </button>

    <div
      v-else
      class="room-compact-chat__panel pointer-events-auto absolute flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md"
      :class="panelClass"
      :style="{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }"
    >
      <header
        class="room-compact-chat__header flex shrink-0 cursor-grab items-center justify-between border-b px-3 py-2 active:cursor-grabbing"
        :class="theater ? 'border-white/10' : 'border-border/40'"
        @pointerdown="startDrag"
      >
        <span
          class="room-compact-chat__title text-xs font-medium"
          :class="theater ? 'text-white' : ''"
        >
          Chat
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="room-compact-chat__minimize size-7"
          :class="theater ? 'text-white/70 hover:bg-white/10 hover:text-white' : ''"
          data-no-drag
          aria-label="Minimize chat"
          @click="minimize"
        >
          <PhMinus class="size-3.5" />
        </Button>
      </header>

      <div
        ref="messagesRef"
        class="room-compact-chat__messages min-h-0 flex-1 overflow-y-auto p-3"
      >
        <p
          v-if="!sortedMessages.length"
          class="room-compact-chat__empty text-center text-xs"
          :class="theater ? 'text-white/40' : 'text-muted-foreground'"
        >
          No messages yet
        </p>

        <div v-else class="room-compact-chat__list space-y-2">
          <div
            v-for="(msg, idx) in sortedMessages"
            :key="idx"
            class="room-compact-chat__message"
          >
            <p
              class="room-compact-chat__author text-[10px] font-medium"
              :class="isOwnMessage(msg) ? 'text-primary' : theater ? 'text-white/50' : 'text-muted-foreground'"
            >
              {{ msg.author }}
            </p>
            <p
              class="room-compact-chat__text text-xs leading-relaxed wrap-break-word"
              :class="theater ? 'text-white/90' : ''"
            >
              {{ messagePreview(msg) }}
            </p>
          </div>
        </div>
      </div>

      <footer
        class="room-compact-chat__composer shrink-0 border-t p-2"
        :class="theater ? 'border-white/10' : 'border-border/40'"
      >
        <div class="room-compact-chat__composer-row flex items-center gap-1.5">
          <Input
            :model-value="newMessage"
            class="room-compact-chat__input h-8 min-w-0 flex-1 text-xs shadow-none"
            :class="
              theater
                ? 'border-white/15 bg-white/5 text-white placeholder:text-white/40'
                : 'border-border/60 bg-background/60'
            "
            type="text"
            placeholder="Message..."
            @update:model-value="emit('update:newMessage', String($event))"
            @keyup.enter="emit('send')"
          />
          <Button
            type="button"
            size="icon"
            class="room-compact-chat__send size-8 shrink-0"
            @click="emit('send')"
          >
            <PhPaperPlaneRight class="size-3.5" />
          </Button>
        </div>
      </footer>

      <div
        class="room-compact-chat__resize room-compact-chat__resize--right absolute inset-y-3 right-0 w-1.5 cursor-ew-resize"
        aria-hidden="true"
        @pointerdown="startResize($event, 'width')"
      />
      <div
        class="room-compact-chat__resize room-compact-chat__resize--bottom absolute inset-x-3 bottom-0 h-1.5 cursor-ns-resize"
        aria-hidden="true"
        @pointerdown="startResize($event, 'height')"
      />
      <div
        class="room-compact-chat__resize room-compact-chat__resize--corner absolute bottom-0 right-0 size-4 cursor-nwse-resize"
        aria-hidden="true"
        @pointerdown="startResize($event, 'both')"
      />
    </div>
  </div>
</template>
