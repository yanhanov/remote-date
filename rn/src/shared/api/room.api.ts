import { API_BASE_URL } from '@/shared/config/api';
import { authAPI } from './auth.api';
import type { VideoRoom, CreateRoomDto, VideoState, RoomType } from './room.types';

class RoomAPI {
  private baseUrl = `${API_BASE_URL}/rooms`;

  async createRoom(dto: CreateRoomDto): Promise<VideoRoom> {
    const response = await authAPI.fetchWithAuth(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create room');
    }

    return response.json();
  }

  async getRoom(roomId: string): Promise<VideoRoom> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/${roomId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get room');
    }

    return response.json();
  }

  async getRoomState(roomId: string): Promise<VideoState> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/${roomId}/state`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get room state');
    }

    return response.json();
  }

  async getLastRoom(type: RoomType): Promise<VideoRoom | null> {
    const response = await authAPI.fetchWithAuth(`${this.baseUrl}/last/${type}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get last room');
    }

    return response.json();
  }
}

export const roomAPI = new RoomAPI();
