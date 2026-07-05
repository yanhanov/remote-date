<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { PhPaperPlaneRight, PhSpinner } from '@phosphor-icons/vue'
import { UserAvatar } from '@/entities/user'
import { DirectMessageContent, useDirectMessages } from '@/features/direct-message'
import { socialAPI } from '@/shared/api/social.api'
import type { ConversationItem, DirectMessageItem } from '@/shared/api/social.types'
import { parseRoomInvite } from '@/shared/lib/room-invite-message'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

const route = useRoute()
const router = useRouter()

const conversations = ref<ConversationItem[]>([])
const messages = ref<DirectMessageItem[]>([])
const activeUserId = ref<string | null>(null)
const activeDisplayName = ref('')
const activeAvatarUrl = ref<string | undefined>()
const newMessage = ref('')
const isLoadingList = ref(true)
const isLoadingThread = ref(false)
const isSending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const selectedUserId = computed(() => route.params.userId as string | undefined)

async function loadConversations() {
  isLoadingList.value = true
  try {
    conversations.value = await socialAPI.getConversations()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Failed to load conversations')
  } finally {
    isLoadingList.value = false
  }
}

async function loadThread(userId: string) {
  isLoadingThread.value = true
  activeUserId.value = userId

  try {
    const thread = await socialAPI.getThread(userId)
    messages.value = thread.messages
    activeDisplayName.value = thread.displayName || 'Friend'
    activeAvatarUrl.value = thread.avatarUrl
  } catch (e: unknown) {
    messages.value = []
    toast.error(e instanceof Error ? e.message : 'Failed to load chat')
  } finally {
    isLoadingThread.value = false
    await nextTick()
    scrollToBottom(false)
  }
}

async function scrollToBottom(smooth = true) {
  await nextTick()
  const el = messagesContainer.value
  if (!el) return
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? 'smooth' : 'instant',
  })
}

const { sendMessage: sendDirectMessage } = useDirectMessages({
  messages,
  conversations,
  activeUserId,
  onThreadMessage: scrollToBottom,
  reloadConversations: loadConversations,
})

async function sendMessage() {
  const text = newMessage.value.trim()
  if (!text || !activeUserId.value || isSending.value) return

  if (!sendDirectMessage(activeUserId.value, text)) return

  newMessage.value = ''
}

function openConversation(userId: string) {
  router.push(`/messages/${userId}`)
}

function formatTime(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function isInviteMessage(text: string) {
  return parseRoomInvite(text) !== null
}

watch(
  selectedUserId,
  async (userId) => {
    if (userId) {
      await loadThread(userId)
    } else {
      activeUserId.value = null
      messages.value = []
    }
  },
  { immediate: true },
)

onMounted(loadConversations)
</script>

<template>
  <div
    class="messages-page flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8"
  >
    <header class="messages-page__header mb-4 shrink-0">
      <h1 class="messages-page__title page-title">Messages</h1>
      <p class="messages-page__subtitle page-subtitle mt-1">
        Chat with your friends outside rooms.
      </p>
    </header>

    <div
      class="messages-page__layout surface grid min-h-0 w-full flex-1 overflow-hidden grid-rows-[minmax(0,11rem)_minmax(0,1fr)] md:grid-cols-[minmax(0,16rem)_1fr] md:grid-rows-1"
    >
      <aside
        class="messages-page__sidebar flex min-h-0 flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r"
      >
        <div
          class="messages-page__sidebar-header shrink-0 border-b border-border px-4 py-3"
        >
          <p class="text-sm font-medium">Conversations</p>
        </div>

        <div
          class="messages-page__conversation-list min-h-0 flex-1 overflow-y-auto scroll-smooth p-2"
        >
          <div v-if="isLoadingList" class="flex justify-center py-8">
            <PhSpinner class="size-5 animate-spin text-muted-foreground" />
          </div>

          <p
            v-else-if="!conversations.length"
            class="px-2 py-4 text-center text-sm text-muted-foreground"
          >
            No conversations yet.
            <RouterLink to="/friends" class="text-primary hover:underline">Add friends</RouterLink>
            first.
          </p>

          <button
            v-for="conversation in conversations"
            :key="conversation.conversationId"
            type="button"
            class="messages-page__conversation-item flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted"
            :class="{
              'bg-muted': activeUserId === conversation.userId,
            }"
            @click="openConversation(conversation.userId)"
          >
            <UserAvatar :user="conversation" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-sm font-medium">{{ conversation.displayName }}</p>
                <span class="shrink-0 text-[10px] text-muted-foreground">
                  {{ formatTime(conversation.lastMessageAt) }}
                </span>
              </div>
              <p class="truncate text-xs text-muted-foreground">
                {{ conversation.lastMessageText || 'No messages yet' }}
              </p>
            </div>
          </button>
        </div>
      </aside>

      <section class="messages-page__thread flex min-h-0 min-w-0 flex-col overflow-hidden">
        <template v-if="activeUserId">
          <header
            class="messages-page__thread-header flex shrink-0 items-center gap-3 border-b border-border px-4 py-3"
          >
            <RouterLink :to="`/users/${activeUserId}`" class="flex items-center gap-3">
              <UserAvatar
                :user="{
                  userId: activeUserId,
                  displayName: activeDisplayName,
                  avatarUrl: activeAvatarUrl,
                }"
                size="sm"
              />
              <p class="text-sm font-medium hover:underline">{{ activeDisplayName }}</p>
            </RouterLink>
          </header>

          <div
            ref="messagesContainer"
            class="messages-page__messages min-h-0 flex-1 space-y-3 overflow-y-auto scroll-smooth p-4"
          >
            <div v-if="isLoadingThread" class="flex justify-center py-10">
              <PhSpinner class="size-5 animate-spin text-muted-foreground" />
            </div>

            <template v-else>
              <div
                v-for="message in messages"
                :key="message.id"
                class="messages-page__message flex"
                :class="message.isOwn ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="messages-page__message-body"
                  :class="
                    cn(
                      isInviteMessage(message.text)
                        ? 'w-full max-w-[min(100%,20rem)]'
                        : 'max-w-[75%] px-3.5 py-2 text-sm',
                      !isInviteMessage(message.text) &&
                        (message.isOwn
                          ? 'rounded-lg rounded-br-sm bg-primary text-primary-foreground'
                          : 'rounded-lg rounded-bl-sm bg-muted text-foreground'),
                    )
                  "
                >
                  <DirectMessageContent
                    :text="message.text"
                    :is-own="message.isOwn"
                    :created-at="message.createdAt"
                  />
                  <p
                    v-if="!isInviteMessage(message.text)"
                    class="mt-1.5 text-[10px] opacity-70"
                    :class="
                      message.isOwn
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    "
                  >
                    {{ formatTime(message.createdAt) }}
                  </p>
                </div>
              </div>
            </template>
          </div>

          <form
            class="messages-page__composer flex shrink-0 gap-2 border-t border-border p-4"
            @submit.prevent="sendMessage"
          >
            <Input
              v-model="newMessage"
              class="messages-page__composer-input"
              placeholder="Write a message..."
              :disabled="isSending"
            />
            <Button type="submit" :disabled="isSending || !newMessage.trim()">
              <PhPaperPlaneRight class="size-4" />
            </Button>
          </form>
        </template>

        <div
          v-else
          class="messages-page__empty flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground"
        >
          Select a conversation or message a friend from their profile.
        </div>
      </section>
    </div>
  </div>
</template>
