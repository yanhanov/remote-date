export type RelationshipStatus =
  | 'self'
  | 'none'
  | 'friend'
  | 'pending_outgoing'
  | 'pending_incoming'

export interface PublicUserSummary {
  userId: string
  username?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  displayName: string
  relationship?: RelationshipStatus
}

export interface PublicUserProfile extends PublicUserSummary {
  birthDate?: string
  sex?: 'male' | 'female' | 'other'
  createdAt: string
  relationship: RelationshipStatus
  incomingRequestId?: string
  friendsSince?: string
}

export interface FriendItem extends PublicUserSummary {
  friendsSince: string
}

export interface FriendRequestItem extends PublicUserSummary {
  requestId: string
  createdAt: string
}

export interface ConversationItem {
  conversationId: string
  userId: string
  displayName: string
  avatarUrl?: string
  lastMessageText?: string
  lastMessageAt?: string
}

export interface DirectMessageItem {
  id: string
  senderId: string
  text: string
  createdAt: string
  isOwn: boolean
}

export interface DmMessagePayload {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  text: string
  createdAt: string
}

export interface MessageThread {
  conversationId: string
  userId: string
  displayName?: string
  avatarUrl?: string
  messages: DirectMessageItem[]
}
