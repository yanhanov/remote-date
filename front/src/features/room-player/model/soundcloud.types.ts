import type { SoundCloudTrack } from '@/shared/api/soundcloud.api'

export type SoundTrack = Omit<SoundCloudTrack, 'id'> & {
  id: string | number
}

export type SoundcloudTrackChangePayload = {
  trackUrl: string
  title?: string
  artist?: string
  artworkUrl?: string
  queue?: {
    id: string | number
    streamUrl: string
    title?: string | null
    username?: string | null
    artworkUrl?: string | null
    permalinkUrl?: string
    durationMs?: number
  }[]
  queueIndex?: number
}
