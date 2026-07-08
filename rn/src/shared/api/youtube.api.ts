import { API_BASE_URL } from '@/shared/config/api';
import { authAPI } from './auth.api';

interface YoutubeVideoRaw {
  video_id: string;
  title: string;
  channel_title?: string;
  thumbnail_url?: string | null;
}

export interface YoutubeVideo {
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnailUrl?: string | null;
}

class YoutubeAPI {
  private baseUrl = `${API_BASE_URL}/youtube`;

  private mapVideo(raw: YoutubeVideoRaw): YoutubeVideo {
    return {
      videoId: raw.video_id,
      title: raw.title,
      channelTitle: raw.channel_title,
      thumbnailUrl: raw.thumbnail_url,
    };
  }

  async searchVideos(query: string, limit = 10): Promise<YoutubeVideo[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await authAPI.fetchWithAuth(`${this.baseUrl}/search?${params}`);

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to search YouTube');
    }

    const data = (await res.json()) as { items: YoutubeVideoRaw[] };
    return data.items.map((item) => this.mapVideo(item));
  }
}

export const youtubeAPI = new YoutubeAPI();
