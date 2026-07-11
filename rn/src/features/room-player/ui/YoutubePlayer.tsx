import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { socketService } from '@/shared/api/socket.service';
import type { VideoRoom, VideoState } from '@/shared/api/room.types';

export { changeRoomVideo } from '@/features/room-player/lib/youtube-player-api';

const WebViewAny = WebView as unknown as React.ComponentType<Record<string, unknown>>;

/**
 * HTTPS origin for WebView Referer — required by YouTube (error 153).
 * Prefer the public app URL; fall back to the app package host.
 */
const PLAYER_ORIGIN = (
  process.env.EXPO_PUBLIC_APP_URL ?? 'https://com.remotedate.app'
).replace(/\/$/, '');

const IS_ANDROID = Platform.OS === 'android';

function buildEmbedUri(videoId: string, origin: string) {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
  const params = new URLSearchParams({
    enablejsapi: '1',
    playsinline: '1',
    controls: '1',
    rel: '0',
    fs: '1',
    modestbranding: '1',
    origin,
    widget_referrer: origin,
  });
  return `https://www.youtube.com/embed/${safeId}?${params.toString()}`;
}

/** Bridge for Android direct-embed WebView (top-level youtube.com/embed). */
const ANDROID_BRIDGE = `
(function () {
  function post(type, data) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
    }
  }

  var player = null;
  var ready = false;
  var isLocalAction = false;
  var currentVideoId = null;

  function getPlayerEl() {
    return document.getElementById('movie_player')
      || document.querySelector('.html5-video-player')
      || document.getElementById('player');
  }

  function bindPlayer() {
    var el = getPlayerEl();
    if (!el) return false;
    player = el;
    if (typeof el.getVideoData === 'function') {
      try {
        var data = el.getVideoData();
        if (data && data.video_id) currentVideoId = data.video_id;
      } catch (e) {}
    }
    ready = true;
    post('ready', {});
    return true;
  }

  window.handleCommand = function (data) {
    if (!data) return;
    var el = player || getPlayerEl();
    if (!el) return;
    isLocalAction = true;
    try {
      if (data.type === 'play') {
        if (data.currentTime != null && el.seekTo) el.seekTo(data.currentTime, true);
        if (el.playVideo) el.playVideo();
      } else if (data.type === 'pause') {
        if (data.currentTime != null && el.seekTo) el.seekTo(data.currentTime, true);
        if (el.pauseVideo) el.pauseVideo();
      } else if (data.type === 'seek') {
        if (el.seekTo) el.seekTo(data.currentTime, true);
      } else if (data.type === 'load') {
        if (data.videoId && data.videoId !== currentVideoId && el.loadVideoById) {
          currentVideoId = data.videoId;
          el.loadVideoById(data.videoId);
        }
      } else if (data.type === 'sync') {
        if (data.currentTime != null && el.seekTo) el.seekTo(data.currentTime, true);
        if (data.isPlaying) { if (el.playVideo) el.playVideo(); }
        else { if (el.pauseVideo) el.pauseVideo(); }
      }
    } catch (e) {
      post('error', { code: 'cmd:' + String(e && e.message || e) });
    }
    setTimeout(function () { isLocalAction = false; }, 400);
  };

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (bindPlayer() || tries > 40) {
      clearInterval(timer);
      if (!ready) post('error', { code: 'no_player_el' });
    }
  }, 250);

  document.addEventListener('message', function (event) {
    try { window.handleCommand(JSON.parse(event.data)); } catch (e) {}
  });
  window.addEventListener('message', function (event) {
    try {
      var payload = typeof event.data === 'string' ? event.data : '';
      if (!payload || payload.charAt(0) !== '{') return;
      window.handleCommand(JSON.parse(payload));
    } catch (e) {}
  });
})();
true;
`;

function buildPlayerHtml(videoId: string, origin: string) {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
  const embedSrc = buildEmbedUri(safeId, origin);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <style>
    html, body { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; overflow: hidden; }
    #player {
      position: absolute; inset: 0; width: 100%; height: 100%;
      border: 0; display: block; background: #000;
    }
  </style>
</head>
<body>
  <iframe
    id="player"
    src="${embedSrc}"
    title="YouTube"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"
  ></iframe>
  <script>
    var player = null;
    var isLocalAction = false;
    var ready = false;
    var currentVideoId = ${JSON.stringify(safeId)};

    function post(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
      }
    }

    function handleCommand(data) {
      if (!data || !player || typeof player.getCurrentTime !== 'function') return;
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
          if (data.videoId && data.videoId !== currentVideoId) {
            currentVideoId = data.videoId;
            player.loadVideoById(data.videoId);
          }
        } else if (data.type === 'sync') {
          if (data.currentTime != null) player.seekTo(data.currentTime, true);
          if (data.isPlaying) player.playVideo();
          else player.pauseVideo();
        }
      } finally {
        setTimeout(function () { isLocalAction = false; }, 400);
      }
    }

    function initPlayer() {
      if (player || !window.YT || !window.YT.Player) return;
      player = new YT.Player('player', {
        events: {
          onReady: function () {
            ready = true;
            post('ready', {});
          },
          onStateChange: function (e) {
            if (isLocalAction || !player || !ready) return;
            var currentTime = player.getCurrentTime();
            if (e.data === YT.PlayerState.PLAYING) post('play', { currentTime: currentTime });
            if (e.data === YT.PlayerState.PAUSED) post('pause', { currentTime: currentTime });
          },
          onError: function (e) {
            post('error', { code: e && e.data });
          }
        }
      });
    }

    window.onYouTubeIframeAPIReady = initPlayer;
    window.handleCommand = handleCommand;

    document.addEventListener('message', function (event) {
      try { handleCommand(JSON.parse(event.data)); } catch (e) {}
    });
    window.addEventListener('message', function (event) {
      try {
        var payload = typeof event.data === 'string' ? event.data : '';
        if (!payload || payload.charAt(0) !== '{') return;
        handleCommand(JSON.parse(payload));
      } catch (e) {}
    });

    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = function () { post('error', { code: 'api_load' }); };
    document.head.appendChild(tag);
    if (window.YT && window.YT.Player) initPlayer();
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
  const readyRef = useRef(false);
  const displayedVideoIdRef = useRef(room?.youtubeVideoId ?? '');
  const videoId = room?.youtubeVideoId ?? '';

  const [bootVideoId] = useState(() => videoId);
  const [activeVideoId, setActiveVideoId] = useState(videoId);

  useEffect(() => {
    if (videoId) setActiveVideoId(videoId);
  }, [videoId]);

  const source = useMemo(() => {
    const id = IS_ANDROID ? activeVideoId : bootVideoId;
    if (!id) return undefined;
    if (IS_ANDROID) {
      return {
        uri: buildEmbedUri(id, PLAYER_ORIGIN),
        headers: { Referer: PLAYER_ORIGIN },
      };
    }
    return {
      html: buildPlayerHtml(id, PLAYER_ORIGIN),
      baseUrl: PLAYER_ORIGIN,
    };
  }, [activeVideoId, bootVideoId]);

  const postToPlayer = useCallback((data: object) => {
    const type = (data as { type?: string }).type;
    const payloadData = data as {
      type?: string;
      currentTime?: number;
      isPlaying?: boolean;
    };
    if (!readyRef.current && (type === 'sync' || type === 'play' || type === 'pause' || type === 'seek')) {
      return;
    }
    // Skip no-op sync that only pauses at 0 — it blanks Android after first frame.
    if (
      type === 'sync' &&
      (payloadData.currentTime ?? 0) <= 0 &&
      !payloadData.isPlaying
    ) {
      return;
    }
    const payload = JSON.stringify(data);
    webRef.current?.postMessage(payload);
    if (IS_ANDROID) {
      webRef.current?.injectJavaScript(
        `try{window.handleCommand && window.handleCommand(${payload});true;}catch(e){true;}`,
      );
    }
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
      if (!data.videoId || data.videoId === displayedVideoIdRef.current) return;
      displayedVideoIdRef.current = data.videoId;
      if (IS_ANDROID) {
        setActiveVideoId(data.videoId);
        readyRef.current = false;
      } else {
        postToPlayer({ type: 'load', videoId: data.videoId });
      }
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
    if (!videoId || videoId === displayedVideoIdRef.current) return;
    displayedVideoIdRef.current = videoId;
    if (IS_ANDROID) {
      setActiveVideoId(videoId);
      readyRef.current = false;
    } else {
      postToPlayer({ type: 'load', videoId });
    }
  }, [videoId, postToPlayer]);

  useEffect(() => {
    if (!room || !readyRef.current) return;
    if (room.currentTime > 0 || room.isPlaying) {
      postToPlayer({
        type: 'sync',
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedAt, postToPlayer]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type: string;
        currentTime?: number;
        code?: number | string;
      };

      if (data.type === 'error') {
        console.warn('[YoutubePlayer] embed error', data.code);
        return;
      }

      if (data.type === 'ready') {
        readyRef.current = true;
        displayedVideoIdRef.current = activeVideoId || bootVideoId || videoId;
        if (room && (room.currentTime > 0 || room.isPlaying)) {
          postToPlayer({
            type: 'sync',
            currentTime: room.currentTime ?? 0,
            isPlaying: room.isPlaying ?? false,
          });
        }
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
      }, 400);
    } catch {
      // ignore
    }
  }

  if (!(IS_ANDROID ? activeVideoId : bootVideoId) || !source) {
    return null;
  }

  return (
    <View style={styles.container} collapsable={false}>
      <WebViewAny
        key={IS_ANDROID ? activeVideoId : bootVideoId}
        ref={webRef}
        source={source}
        originWhitelist={['*']}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        mixedContentMode="always"
        nestedScrollEnabled
        scrollEnabled={false}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        injectedJavaScript={IS_ANDROID ? ANDROID_BRIDGE : undefined}
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
    minHeight: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
});
