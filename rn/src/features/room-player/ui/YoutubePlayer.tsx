import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { socketService } from '@/shared/api/socket.service';
import type { VideoRoom, VideoState } from '@/shared/api/room.types';

export { changeRoomVideo } from '@/features/room-player/lib/youtube-player-api';

const WebViewAny = WebView as unknown as React.ComponentType<Record<string, unknown>>;

function buildPlayerHtml(videoId: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    html, body { margin: 0; padding: 0; background: #000; height: 100%; }
    #player { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script src="https://www.youtube.com/iframe_api"></script>
  <script>
    let player;
    let isLocalAction = false;

    function post(type, data) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
    }

    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '${videoId}',
        playerVars: { playsinline: 1, controls: 1, rel: 0 },
        events: {
          onReady: () => post('ready', {}),
          onStateChange: (e) => {
            if (isLocalAction) return;
            const currentTime = player.getCurrentTime();
            if (e.data === YT.PlayerState.PLAYING) post('play', { currentTime });
            if (e.data === YT.PlayerState.PAUSED) post('pause', { currentTime });
          }
        }
      });
    }

    document.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleCommand(data);
      } catch (e) {}
    });
    window.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleCommand(data);
      } catch (e) {}
    });

    function handleCommand(data) {
      if (!player || !player.getCurrentTime) return;
      isLocalAction = true;
      try {
        if (data.type === 'play') {
          if (data.currentTime != null) player.seekTo(data.currentTime, true);
          player.playVideo();
        } else if (data.type === 'pause') {
          if (data.currentTime != null) player.seekTo(data.currentTime, true);
          player.pauseVideo();
        } else if (data.type === 'seek') {
          player.seekTo(data.currentTime, true);
        } else if (data.type === 'load') {
          player.loadVideoById(data.videoId);
        } else if (data.type === 'sync') {
          player.seekTo(data.currentTime, true);
          if (data.isPlaying) player.playVideo();
          else player.pauseVideo();
        }
      } finally {
        setTimeout(() => { isLocalAction = false; }, 300);
      }
    }
  </script>
</body>
</html>`;
}

interface YoutubePlayerProps {
  roomId: string;
  room: VideoRoom | null;
  loadedAt: number;
  onVideoChange?: (videoId: string) => void;
}

export function YoutubePlayer({ roomId, room, loadedAt }: YoutubePlayerProps) {
  const webRef = useRef<WebView>(null);
  const isLocalAction = useRef(false);
  const videoId = room?.youtubeVideoId ?? '';

  const postToPlayer = useCallback((data: object) => {
    webRef.current?.postMessage(JSON.stringify(data));
  }, []);

  const handleVideoState = useCallback(
    (state: VideoState) => {
      if (isLocalAction.current) return;
      postToPlayer({ type: 'sync', currentTime: state.currentTime, isPlaying: state.isPlaying });
    },
    [postToPlayer],
  );

  useEffect(() => {
    const onPlay = (data: { currentTime: number }) => {
      if (isLocalAction.current) return;
      postToPlayer({ type: 'play', currentTime: data.currentTime });
    };
    const onPause = (data: { currentTime: number }) => {
      if (isLocalAction.current) return;
      postToPlayer({ type: 'pause', currentTime: data.currentTime });
    };
    const onSeek = (data: { currentTime: number }) => {
      if (isLocalAction.current) return;
      postToPlayer({ type: 'seek', currentTime: data.currentTime });
    };
    const onChange = (data: { videoId: string }) => {
      postToPlayer({ type: 'load', videoId: data.videoId });
    };

    socketService.on('video:state', handleVideoState);
    socketService.on('video:play', onPlay);
    socketService.on('video:pause', onPause);
    socketService.on('video:seek', onSeek);
    socketService.on('video:sync', handleVideoState);
    socketService.on('video:change', onChange);

    return () => {
      socketService.off('video:state', handleVideoState);
      socketService.off('video:play', onPlay);
      socketService.off('video:pause', onPause);
      socketService.off('video:seek', onSeek);
      socketService.off('video:sync', handleVideoState);
      socketService.off('video:change', onChange);
    };
  }, [handleVideoState, postToPlayer]);

  useEffect(() => {
    if (room && room.currentTime > 0) {
      postToPlayer({
        type: 'sync',
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
      });
    }
  }, [loadedAt, room, postToPlayer]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type: string;
        currentTime?: number;
      };

      if (data.type === 'ready' && room) {
        postToPlayer({
          type: 'sync',
          currentTime: room.currentTime ?? 0,
          isPlaying: room.isPlaying ?? false,
        });
        socketService.emit('video:sync_request', roomId);
        return;
      }

      isLocalAction.current = true;
      if (data.type === 'play') {
        socketService.emit('video:play', { roomId, currentTime: data.currentTime });
      } else if (data.type === 'pause') {
        socketService.emit('video:pause', { roomId, currentTime: data.currentTime });
      }
      setTimeout(() => {
        isLocalAction.current = false;
      }, 300);
    } catch {
      // ignore
    }
  }

  if (!videoId) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WebViewAny
        ref={webRef}
        source={{ html: buildPlayerHtml(videoId) }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onMessage={onMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
