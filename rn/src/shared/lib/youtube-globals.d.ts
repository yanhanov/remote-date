export interface YoutubePlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(videoId: string): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  getIframe?(): HTMLIFrameElement;
  setSize?(width: number, height: number): void;
  destroy?(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          host?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YoutubePlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YoutubePlayerInstance }) => void;
          };
        },
      ) => YoutubePlayerInstance;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
