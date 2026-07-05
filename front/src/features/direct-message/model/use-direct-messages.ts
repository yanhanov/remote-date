import { onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { authStore } from '@/entities/user'
import { socketService } from '@/shared/api/socket.service'
import type {
  ConversationItem,
  DirectMessageItem,
  DirectMessageStatus,
  DmMessagePayload,
  DmStatusPayload,
} from '@/shared/api/social.types'

function deriveStatus(payload: DmMessagePayload, isOwn: boolean): DirectMessageStatus | undefined {
  if (!isOwn) return undefined
  if (payload.readAt || payload.status === 'read') return 'read'
  if (payload.deliveredAt || payload.status === 'delivered') return 'delivered'
  return payload.status ?? 'sent'
}

function toDirectMessage(payload: DmMessagePayload, currentUserId: string): DirectMessageItem {
  const isOwn = payload.senderId === currentUserId

  return {
    id: payload.id,
    senderId: payload.senderId,
    text: payload.text,
    createdAt: payload.createdAt,
    isOwn,
    status: deriveStatus(payload, isOwn),
    deliveredAt: payload.deliveredAt,
    readAt: payload.readAt,
  }
}

function peerUserId(payload: DmMessagePayload, currentUserId: string): string {
  return payload.senderId === currentUserId ? payload.recipientId : payload.senderId
}

function markConversationRead(otherUserId: string) {
  socketService.connectAuthenticated()
  socketService.emit('dm:read', { otherUserId })
}

export function useDirectMessages(options: {
  messages: { value: DirectMessageItem[] }
  conversations: { value: ConversationItem[] }
  activeUserId: { value: string | null }
  onThreadMessage?: () => void
  reloadConversations: () => Promise<void>
}) {
  function removePendingMessage(text: string) {
    const pendingIndex = options.messages.value.findIndex(
      (item) => item.id.startsWith('pending-') && item.text === text,
    )
    if (pendingIndex !== -1) {
      options.messages.value.splice(pendingIndex, 1)
    }
  }

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

  function applyStatusUpdate(payload: DmStatusPayload) {
    for (const messageId of payload.messageIds) {
      const message = options.messages.value.find((item) => item.id === messageId)
      if (!message?.isOwn) continue
      message.status = payload.status
      if (payload.status === 'delivered' && !message.deliveredAt) {
        message.deliveredAt = new Date().toISOString()
      }
      if (payload.status === 'read') {
        message.readAt = new Date().toISOString()
        message.deliveredAt ??= message.readAt
      }
    }
  }

  function handleIncomingMessage(payload: DmMessagePayload) {
    const currentUserId = authStore.user.value?.userId
    if (!currentUserId) return

    const otherUserId = peerUserId(payload, currentUserId)
    const message = toDirectMessage(payload, currentUserId)

    if (message.isOwn) {
      removePendingMessage(message.text)
    }

    updateConversationPreview(payload, currentUserId)

    if (options.activeUserId.value === otherUserId) {
      appendMessage(message)
      options.onThreadMessage?.()

      if (!message.isOwn) {
        markConversationRead(otherUserId)
      }
    } else if (!message.isOwn) {
      toast.info('New message received')
    }
  }

  function handleDmError(error: { message: string }) {
    const pendingIndex = options.messages.value.findIndex(
      (item) => item.id.startsWith('pending-') && item.status === 'sending',
    )
    if (pendingIndex !== -1) {
      options.messages.value.splice(pendingIndex, 1)
    }
    toast.error(error.message || 'Failed to send message')
  }

  function sendMessage(recipientId: string, text: string): boolean {
    const currentUserId = authStore.user.value?.userId
    if (!currentUserId) return false

    socketService.connectAuthenticated()

    if (options.activeUserId.value === recipientId) {
      options.messages.value.push({
        id: `pending-${crypto.randomUUID()}`,
        senderId: currentUserId,
        text,
        createdAt: new Date().toISOString(),
        isOwn: true,
        status: 'sending',
      })
      options.onThreadMessage?.()
    }

    socketService.emit('dm:send', { recipientId, text })
    return true
  }

  onMounted(() => {
    socketService.connectAuthenticated()
    socketService.on('dm:message', handleIncomingMessage)
    socketService.on('dm:status', applyStatusUpdate)
    socketService.on('dm:error', handleDmError)
  })

  onUnmounted(() => {
    socketService.off('dm:message', handleIncomingMessage)
    socketService.off('dm:status', applyStatusUpdate)
    socketService.off('dm:error', handleDmError)
  })

  return { sendMessage, markConversationRead }
}
