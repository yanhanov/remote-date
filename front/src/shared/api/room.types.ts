export type RoomType = 'youtube' | 'soundcloud'

export interface SoundcloudQueueItem {
  id: string | number
  streamUrl: string
  title?: string | null
  username?: string | null
  artworkUrl?: string | null
  permalinkUrl?: string
  durationMs?: number
}

export interface VideoRoom {
  id: string
  type: RoomType
  youtubeUrl?: string
  youtubeVideoId?: string
  soundcloudUrl?: string
  soundcloudTitle?: string
  soundcloudArtist?: string
  soundcloudArtworkUrl?: string
  soundcloudQueue?: SoundcloudQueueItem[]
  soundcloudQueueIndex?: number
  createdAt: string
  currentTime: number
  isPlaying: boolean
  participants: number
}

export interface CreateRoomDto {
  youtubeUrl?: string
  soundcloudUrl?: string
  type?: RoomType
}

export interface VideoState {
  currentTime: number
  isPlaying: boolean
  timestamp: number
}
