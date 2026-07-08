import { API_BASE_URL } from '@/shared/config/api';
import { authAPI } from './auth.api';
import type {
  ConversationItem,
  DirectMessageItem,
  FriendItem,
  FriendRequestItem,
  MessageThread,
  PublicUserProfile,
  PublicUserSummary,
} from './social.types';

class SocialAPI {
  private baseUrl = `${API_BASE_URL}/social`;

  async searchUsers(query: string): Promise<PublicUserSummary[]> {
    const params = new URLSearchParams({ q: query });
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/users/search?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search users');
    }

    const data = await response.json();
    return data.users;
  }

  async getUserProfile(userId: string): Promise<PublicUserProfile> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/users/${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load profile');
    }

    return response.json();
  }

  async getFriends(): Promise<FriendItem[]> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/friends`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load friends');
    }

    const data = await response.json();
    return data.friends;
  }

  async getFriendRequests(): Promise<{
    incoming: FriendRequestItem[];
    outgoing: FriendRequestItem[];
  }> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/friends/requests`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load friend requests');
    }

    return response.json();
  }

  async sendFriendRequest(toUserId: string): Promise<void> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/friends/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send friend request');
    }
  }

  async acceptFriendRequest(requestId: string): Promise<void> {
    const response = await authAPI.fetchWithAuth(
      `${this.baseUrl}/friends/requests/${requestId}/accept`,
      { method: 'POST' },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to accept request');
    }
  }

  async rejectFriendRequest(requestId: string): Promise<void> {
    const response = await authAPI.fetchWithAuth(
      `${this.baseUrl}/friends/requests/${requestId}`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject request');
    }
  }

  async getConversations(): Promise<ConversationItem[]> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/messages/conversations`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load conversations');
    }

    const data = await response.json();
    return data.conversations;
  }

  async getThread(userId: string): Promise<MessageThread> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/messages/with/${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load messages');
    }

    return response.json();
  }

  async sendMessage(userId: string, text: string): Promise<DirectMessageItem> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/messages/with/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json();
  }
}

export const socialAPI = new SocialAPI();

export function getUserInitials(
  user: Pick<PublicUserSummary, 'firstName' | 'lastName' | 'userId'> & {
    displayName?: string;
    email?: string;
  },
) {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.displayName) return user.displayName.slice(0, 2).toUpperCase();
  if (user.email) return user.email[0]?.toUpperCase() || 'U';
  return user.userId.slice(0, 2).toUpperCase();
}
