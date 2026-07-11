<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useMediaQuery } from "@vueuse/core";
import { toast } from "vue-sonner";
import { PhCaretLeft, PhChatsCircle, PhSpinner } from "@phosphor-icons/vue";
import SendPlaneIcon from "@/shared/ui/icons/SendPlaneIcon.vue";
import { UserAvatar } from "@/entities/user";
import {
  DirectMessageContent,
  MessageStatusIcon,
  useDirectMessages,
} from "@/features/direct-message";
import { socialAPI } from "@/shared/api/social.api";
import type {
  ConversationItem,
  DirectMessageItem,
} from "@/shared/api/social.types";
import { parseRoomInvite } from "@/shared/lib/room-invite-message";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

const route = useRoute();
const router = useRouter();
const isMobile = useMediaQuery("(max-width: 768px)");

const conversations = ref<ConversationItem[]>([]);
const messages = ref<DirectMessageItem[]>([]);
const activeUserId = ref<string | null>(null);
const activeDisplayName = ref("");
const activeAvatarUrl = ref<string | undefined>();
const newMessage = ref("");
const isLoadingList = ref(true);
const isLoadingThread = ref(false);
const isSending = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

const selectedUserId = computed(
  () => route.params.userId as string | undefined,
);

const showSidebar = computed(() => !isMobile.value || !activeUserId.value);
const showThread = computed(() => !isMobile.value || !!activeUserId.value);

async function loadConversations() {
  isLoadingList.value = true;
  try {
    conversations.value = await socialAPI.getConversations();
  } catch (e: unknown) {
    toast.error(
      e instanceof Error ? e.message : "Failed to load conversations",
    );
  } finally {
    isLoadingList.value = false;
  }
}

async function focusComposer() {
  await nextTick();
  document.getElementById("messages-composer-input")?.focus();
}

function autoGrowComposer(event?: Event) {
  const el =
    (event?.target as HTMLTextAreaElement | null) ??
    (document.getElementById("messages-composer-input") as HTMLTextAreaElement | null);
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
}

async function loadThread(userId: string) {
  isLoadingThread.value = true;
  activeUserId.value = userId;

  try {
    const thread = await socialAPI.getThread(userId);
    messages.value = thread.messages;
    activeDisplayName.value = thread.displayName || "Friend";
    activeAvatarUrl.value = thread.avatarUrl;
  } catch (e: unknown) {
    messages.value = [];
    toast.error(e instanceof Error ? e.message : "Failed to load chat");
  } finally {
    isLoadingThread.value = false;
    await nextTick();
    scrollToBottom(false);
    requestAnimationFrame(() => {
      scrollToBottom(false);
      setTimeout(() => scrollToBottom(false), 50);
    });
    await focusComposer();
  }
}

async function scrollToBottom(smooth = true) {
  await nextTick();
  const el = messagesContainer.value;
  if (!el) return;

  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? "smooth" : "instant",
  });
}

const { sendMessage: sendDirectMessage } = useDirectMessages({
  messages,
  conversations,
  activeUserId,
  onThreadMessage: () => scrollToBottom(true),
  reloadConversations: loadConversations,
});

async function sendMessage() {
  const text = newMessage.value.trim();
  if (!text || !activeUserId.value || isSending.value) return;

  if (!sendDirectMessage(activeUserId.value, text)) return;

  newMessage.value = "";
  await nextTick();
  autoGrowComposer();
  await focusComposer();
  await scrollToBottom(true);
}

function openConversation(userId: string) {
  router.push(`/messages/${userId}`);
}

function closeConversation() {
  router.push("/messages");
}

function formatTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isInviteMessage(text: string) {
  return parseRoomInvite(text) !== null;
}

watch(
  selectedUserId,
  async (userId, previousUserId) => {
    if (userId !== previousUserId) {
      newMessage.value = "";
    }

    if (userId) {
      await loadThread(userId);
    } else {
      activeUserId.value = null;
      messages.value = [];
    }
  },
  { immediate: true },
);

onMounted(loadConversations);
</script>

<template>
  <div
    class="messages-page flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
  >
    <div
      class="messages-page__layout grid min-h-0 flex-1 overflow-hidden md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
    >
      <aside
        v-show="showSidebar"
        class="messages-page__sidebar flex min-h-0 flex-col overflow-hidden border-border/70 md:border-r"
      >
        <div
          class="messages-page__conversation-list min-h-0 flex-1 overflow-y-auto scroll-smooth"
        >
          <div v-if="isLoadingList" class="flex justify-center py-10">
            <PhSpinner class="size-5 animate-spin text-muted-foreground" />
          </div>

          <p
            v-else-if="!conversations.length"
            class="px-4 py-10 text-center text-sm text-muted-foreground"
          >
            No conversations yet.
            <RouterLink to="/friends" class="text-primary hover:underline">
              Add friends
            </RouterLink>
          </p>

          <button
            v-for="conversation in conversations"
            :key="conversation.conversationId"
            type="button"
            class="messages-page__conversation-item flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
            :class="{
              'bg-primary/10 hover:bg-primary/10':
                activeUserId === conversation.userId,
            }"
            @click="openConversation(conversation.userId)"
          >
            <UserAvatar :user="conversation" size="md" />
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate text-[15px] font-medium leading-tight">
                  {{ conversation.displayName }}
                </p>
                <span
                  v-if="conversation.lastMessageAt"
                  class="shrink-0 text-xs text-muted-foreground"
                >
                  {{ formatTime(conversation.lastMessageAt) }}
                </span>
              </div>
              <p class="mt-0.5 truncate text-sm text-muted-foreground">
                {{ conversation.lastMessageText || "No messages yet" }}
              </p>
            </div>
          </button>
        </div>
      </aside>

      <section
        v-show="showThread"
        class="messages-page__thread relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-background"
      >
        <template v-if="activeUserId">
          <RouterLink
            :to="`/users/${activeUserId}`"
            class="messages-page__thread-header group absolute top-[10px] right-[10px] left-[10px] z-20 flex h-14 items-center gap-2 rounded-[30px] border border-border/40 bg-card/90 px-2 shadow-sm backdrop-blur-2xl transition-colors hover:bg-card md:px-3"
          >
            <span
              v-if="isMobile"
              role="button"
              tabindex="0"
              class="messages-page__back flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-accent/60 hover:text-foreground active:scale-95"
              aria-label="Back to chats"
              @click.prevent.stop="closeConversation"
              @keydown.enter.prevent.stop="closeConversation"
            >
              <PhCaretLeft class="size-5" weight="bold" />
            </span>

            <UserAvatar
              :user="{
                userId: activeUserId,
                displayName: activeDisplayName,
                avatarUrl: activeAvatarUrl,
              }"
              size="sm"
              class="ring-2 ring-background"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-semibold tracking-tight">
                {{ activeDisplayName }}
              </p>
              <p
                class="truncate text-xs text-muted-foreground transition-colors group-hover:text-primary"
              >
                View profile
              </p>
            </div>
          </RouterLink>

          <div
            ref="messagesContainer"
            class="messages-page__messages absolute inset-0 z-0 space-y-2 overflow-y-auto scroll-smooth px-[10px] pt-[calc(10px+3.5rem+8px)] pb-[calc(10px+2.75rem+8px+4.25rem+env(safe-area-inset-bottom))] md:pb-[calc(10px+2.75rem+8px)]"
          >
            <div v-if="isLoadingThread" class="flex justify-center py-16">
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
                        ? 'w-full max-w-[min(100%,22rem)]'
                        : 'max-w-[min(100%,20rem)] text-[15px] leading-relaxed',
                      !isInviteMessage(message.text) &&
                        (message.isOwn
                          ? 'rounded-[1.25rem] rounded-br-md bg-gradient-to-br from-primary to-primary/88 px-3.5 py-2 text-primary-foreground shadow-[0_8px_24px_-10px] shadow-primary/45'
                          : 'rounded-[1.25rem] rounded-bl-md border border-border/60 bg-card/90 px-3.5 py-2 text-foreground shadow-[0_4px_20px_-12px] shadow-black/10 backdrop-blur-sm'),
                    )
                  "
                >
                  <div
                    v-if="!isInviteMessage(message.text)"
                    class="flex flex-wrap items-end gap-x-2 gap-y-0.5"
                  >
                    <div class="min-w-0 flex-1 break-words">
                      <DirectMessageContent
                        :text="message.text"
                        :is-own="message.isOwn"
                        :created-at="message.createdAt"
                      />
                    </div>
                    <div
                      class="ml-auto flex shrink-0 items-center gap-1 pb-px"
                      :class="message.isOwn ? '' : 'opacity-60'"
                    >
                      <span
                        class="text-[10px] font-medium tabular-nums"
                        :class="
                          message.isOwn
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground'
                        "
                      >
                        {{ formatTime(message.createdAt) }}
                      </span>
                      <MessageStatusIcon
                        v-if="message.isOwn"
                        :status="message.status ?? 'sent'"
                      />
                    </div>
                  </div>
                  <DirectMessageContent
                    v-else
                    :text="message.text"
                    :is-own="message.isOwn"
                    :created-at="message.createdAt"
                  />
                </div>
              </div>
            </template>
          </div>

          <form
            class="messages-page__composer absolute right-[10px] bottom-[calc(10px+4.25rem+env(safe-area-inset-bottom))] left-[10px] z-20 flex items-end gap-2 md:bottom-[10px]"
            @submit.prevent="sendMessage"
          >
            <textarea
              id="messages-composer-input"
              v-model="newMessage"
              rows="1"
              class="messages-page__composer-input max-h-[7.5rem] min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-[22px] border border-border bg-card px-4 py-2.5 text-[15px] leading-5 shadow-[0_4px_16px_-8px] shadow-black/10 outline-none focus-visible:border-border focus-visible:ring-0"
              placeholder="Write a message..."
              :disabled="isSending"
              @keydown.enter.exact.prevent="sendMessage"
              @input="autoGrowComposer"
            />
            <Button
              type="submit"
              size="icon"
              class="messages-page__composer-submit size-11 shrink-0 rounded-[22px] border shadow-sm transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-100"
              :class="
                newMessage.trim()
                  ? 'border-transparent bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90'
                  : 'border-border bg-card text-muted-foreground'
              "
              :disabled="isSending || !newMessage.trim()"
            >
              <SendPlaneIcon class="size-5" />
            </Button>
          </form>
        </template>

        <div
          v-else
          class="messages-page__empty relative z-10 flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <span
            class="messages-page__empty-icon flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20"
          >
            <PhChatsCircle class="size-8 text-primary" weight="duotone" />
          </span>
          <div class="space-y-1.5">
            <p class="text-base font-semibold tracking-tight">Select a chat</p>
            <p class="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Choose a conversation or start messaging from a friend's profile.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
