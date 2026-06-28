import { onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { authStore } from '@/entities/user'
import { socketService } from '@/shared/api/socket.service'
import type { ConversationItem, DirectMessageItem, DmMessagePayload } from '@/shared/api/social.types'

function toDirectMessage(payload: DmMessagePayload, currentUserId: string): DirectMessageItem {
  return {
    id: payload.id,
    senderId: payload.senderId,
    text: payload.text,
    createdAt: payload.createdAt,
    isOwn: payload.senderId === currentUserId,
  }
}

function peerUserId(payload: DmMessagePayload, currentUserId: string): string {
  return payload.senderId === currentUserId ? payload.recipientId : payload.senderId
}

export function useDirectMessages(options: {
  messages: { value: DirectMessageItem[] }
  conversations: { value: ConversationItem[] }
  activeUserId: { value: string | null }
  onThreadMessage?: () => void
  reloadConversations: () => Promise<void>
}) {
  function appendMessage(message: DirectMessageItem) {
    if (options.messages.value.some((item) => item.id === message.id)) return
    options.messages.value.push(message)
  }

  function updateConversationPreview(payload: DmMessagePayload, currentUserId: string) {
    const otherUserId = peerUserId(payload, currentUserId)
    const existingIndex = options.conversations.value.findIndex(
      (item) =>
        item.conversationId === payload.conversationId || item.userId === otherUserId,
    )

    if (existingIndex === -1) {
      void options.reloadConversations()
      return
    }

    const existing = options.conversations.value[existingIndex]!
    const updated: ConversationItem = {
      userId: existing.userId,
      displayName: existing.displayName,
      avatarUrl: existing.avatarUrl,
      conversationId: payload.conversationId,
      lastMessageText: payload.text,
      lastMessageAt: payload.createdAt,
    }

    options.conversations.value = [
      updated,
      ...options.conversations.value.filter((_, index) => index !== existingIndex),
    ]
  }

  function handleIncomingMessage(payload: DmMessagePayload) {
    const currentUserId = authStore.user.value?.userId
    if (!currentUserId) return

    const message = toDirectMessage(payload, currentUserId)
    updateConversationPreview(payload, currentUserId)

    const otherUserId = peerUserId(payload, currentUserId)
    if (options.activeUserId.value === otherUserId) {
      appendMessage(message)
      options.onThreadMessage?.()
    } else if (message.isOwn === false) {
      toast.info('New message received')
    }
  }

  function handleDmError(error: { message: string }) {
    toast.error(error.message || 'Failed to send message')
  }

  function sendMessage(recipientId: string, text: string): boolean {
    socketService.connectAuthenticated()
    socketService.emit('dm:send', { recipientId, text })
    return true
  }

  onMounted(() => {
    socketService.connectAuthenticated()
    socketService.on('dm:message', handleIncomingMessage)
    socketService.on('dm:error', handleDmError)
  })

  onUnmounted(() => {
    socketService.off('dm:message', handleIncomingMessage)
    socketService.off('dm:error', handleDmError)
  })

  return { sendMessage }
}
