import { API_BASE_URL } from "@/shared/config/api";
import { authAPI } from "./auth.api";

/** Ответ бэкенда (snake_case) */
interface SoundCloudTrackRaw {
  id: number;
  title: string;
  username?: string;
  artwork_url?: string | null;
  permalink_url?: string;
  duration_ms?: number;
  stream_url?: string | null;
}

export interface SoundCloudTrack {
  id: number;
  title: string;
  username?: string;
  artworkUrl?: string | null;
  permalinkUrl: string;
  durationMs: number;
  streamUrl?: string | null;
}

export interface SoundCloudPlaylist {
  id: number;
  title: string;
  username?: string;
  artworkUrl?: string | null;
  permalinkUrl: string;
  trackCount?: number;
  kind: "playlist";
}

export type SoundCloudSearchItem = SoundCloudTrack | SoundCloudPlaylist;

export interface SoundCloudSearchResult {
  items: SoundCloudSearchItem[];
  kind?: "tracks" | "playlists";
}

class SoundCloudAPI {
  private baseUrl = `${API_BASE_URL}/soundcloud`;

  private mapTrack(raw: SoundCloudTrackRaw): SoundCloudTrack {
    return {
      id: raw.id,
      title: raw.title,
      username: raw.username,
      artworkUrl: raw.artwork_url,
      permalinkUrl: raw.permalink_url ?? "",
      durationMs: raw.duration_ms ?? 0,
      streamUrl: raw.stream_url,
    };
  }

  async searchTracks(
    query: string,
    limit = 5,
    filter: "tracks" | "playlists" = "tracks",
  ): Promise<SoundCloudSearchItem[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("filter", filter);

    const res = await authAPI.fetchWithAuth(url.toString());

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to search");
    }

    const data = (await res.json()) as {
      items: SoundCloudTrackRaw[];
      kind?: string;
    };
    return data.items.map((item) => this.mapTrack(item));
  }

  async getPlaylistTracks(
    playlistId: string | number,
  ): Promise<SoundCloudTrack[]> {
    const res = await authAPI.fetchWithAuth(
      `${this.baseUrl}/playlist/${playlistId}`,
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to fetch playlist tracks");
    }

    const data = (await res.json()) as { items: SoundCloudTrackRaw[] };
    return data.items.map((item) => this.mapTrack(item));
  }
}

export const soundCloudAPI = new SoundCloudAPI();
