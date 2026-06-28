<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { ChatMessage } from '@/shared/api/chat.types'
import { Plus, Send } from 'lucide-vue-next'

type UiChatMessage = ChatMessage & {
  isOwn?: boolean
  imageUrl?: string
}

const props = defineProps<{
  messages: UiChatMessage[]
  newMessage: string
  loading?: boolean
  currentUserName?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:newMessage', value: string): void
  (e: 'send'): void
  (e: 'playTrack', url: string): void
  (e: 'sendFile', file: File): void
}>()

const sortedMessages = computed(() =>
  [...props.messages].sort((a, b) => a.time - b.time),
)

const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function isOwnMessage(msg: UiChatMessage) {
  return Boolean(
    msg.author && props.currentUserName && msg.author === props.currentUserName,
  )
}

function scrollToBottom() {
  const el = messagesContainer.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function openFileDialog() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('sendFile', file)
  input.value = ''
}

watch(
  sortedMessages,
  async () => {
    await nextTick()
    scrollToBottom()
  },
  { deep: true },
)
</script>

<template>
  <section
    class="room-chat-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40"
  >
    <header
      class="room-chat-panel__header shrink-0 border-b border-border/40 px-4 py-3"
    >
      <h2 class="room-chat-panel__title text-sm font-medium">Chat</h2>
    </header>

    <div
      ref="messagesContainer"
      class="room-chat-panel__messages min-h-0 flex-1 overflow-y-auto p-3"
    >
      <p
        v-if="!sortedMessages.length && !loading"
        class="room-chat-panel__empty py-8 text-center text-xs text-muted-foreground"
      >
        No messages yet. Start the conversation!
      </p>

      <div v-else class="room-chat-panel__list space-y-3">
        <div
          v-for="(msg, idx) in sortedMessages"
          :key="idx"
          class="room-chat-panel__message flex max-w-[88%] flex-col"
          :class="isOwnMessage(msg) ? 'ml-auto items-end' : 'mr-auto items-start'"
        >
          <div
            class="room-chat-panel__bubble rounded-2xl px-3 py-2 text-sm wrap-break-word"
            :class="
              isOwnMessage(msg)
                ? 'room-chat-panel__bubble--own rounded-br-md bg-primary text-primary-foreground'
                : 'room-chat-panel__bubble--other rounded-bl-md border border-border/60 bg-background/60'
            "
          >
            <p
              class="room-chat-panel__author mb-1 text-[11px] font-medium"
              :class="
                isOwnMessage(msg)
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground'
              "
            >
              {{ msg.author }}
            </p>

            <p v-if="msg.text" class="room-chat-panel__text">{{ msg.text }}</p>

            <button
              v-if="msg.trackUrl"
              class="room-chat-panel__track mt-1 inline-flex items-center gap-1 text-xs hover:underline"
              :class="isOwnMessage(msg) ? 'text-primary-foreground/90' : 'text-primary'"
              type="button"
              @click="emit('playTrack', msg.trackUrl!)"
            >
              ▶ Play track
            </button>

            <div
              v-if="msg.imageUrl"
              class="room-chat-panel__image mt-2 max-w-[200px] overflow-hidden rounded-lg border border-border/40"
            >
              <img
                :src="msg.imageUrl"
                alt="attachment"
                class="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer
      class="room-chat-panel__composer shrink-0 border-t border-border/40 p-3"
    >
      <div class="room-chat-panel__composer-row flex min-w-0 items-center gap-2">
        <div class="room-chat-panel__input-wrap min-w-0 flex-1">
          <Input
            :model-value="newMessage"
            class="room-chat-panel__input h-9 border-border/60 bg-background/60 shadow-none"
            type="text"
            placeholder="Message..."
            @update:model-value="emit('update:newMessage', String($event))"
            @keyup.enter="emit('send')"
          />
        </div>

        <Button
          type="button"
          size="icon"
          variant="secondary"
          class="room-chat-panel__attach size-9 shrink-0"
          @click="openFileDialog"
        >
          <Plus class="size-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          class="room-chat-panel__send size-9 shrink-0"
          @click="emit('send')"
        >
          <Send class="size-4" />
        </Button>
      </div>
    </footer>

    <input
      ref="fileInput"
      type="file"
      accept="image/*,audio/*"
      class="hidden"
      @change="handleFileChange"
    />
  </section>
</template>
