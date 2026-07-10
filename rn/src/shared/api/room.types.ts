export type RoomType = 'youtube' | 'soundcloud' | 'belet';

export interface SoundcloudQueueItem {
  id: string | number;
  streamUrl: string;
  title?: string | null;
  username?: string | null;
  artworkUrl?: string | null;
  permalinkUrl?: string;
  durationMs?: number;
}

export interface VideoRoom {
  id: string;
  type: RoomType;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  soundcloudUrl?: string;
  soundcloudTitle?: string;
  soundcloudArtist?: string;
  soundcloudArtworkUrl?: string;
  soundcloudQueue?: SoundcloudQueueItem[];
  soundcloudQueueIndex?: number;
  beletUrl?: string;
  beletTitle?: string;
  createdAt: string;
  currentTime: number;
  isPlaying: boolean;
  participants: number;
}

export interface CreateRoomDto {
  youtubeUrl?: string;
  soundcloudUrl?: string;
  beletUrl?: string;
  type?: RoomType;
}

export interface VideoState {
  currentTime: number;
  isPlaying: boolean;
  timestamp: number;
}
