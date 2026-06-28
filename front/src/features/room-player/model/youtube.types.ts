export type YoutubePlayerInstance = {
  destroy?: () => void
  getIframe?: () => HTMLIFrameElement
  getPlayerState?: () => number
  getCurrentTime?: () => number
  getDuration?: () => number
  setSize?: (width: number, height: number) => void
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void
  playVideo?: () => void
  pauseVideo?: () => void
  loadVideoById?: (args: { videoId: string; startSeconds?: number }) => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string
          width: number
          height: number
          playerVars?: Record<string, string | number>
          events?: {
            onReady?: (event: { target: YoutubePlayerInstance }) => void
            onStateChange?: (event: { target: YoutubePlayerInstance; data: number }) => void
            onError?: (event: { data: number }) => void
          }
        },
      ) => YoutubePlayerInstance
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export const YOUTUBE_PLAYER_ELEMENT_ID = 'youtube-player'
