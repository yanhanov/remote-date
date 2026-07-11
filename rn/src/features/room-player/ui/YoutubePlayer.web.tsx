import React, { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { socketService } from '@/shared/api/socket.service';
import type { VideoRoom, VideoState } from '@/shared/api/room.types';
import { loadYouTubeAPI } from '@/shared/lib/load-youtube-api';
import type { YoutubePlayerInstance } from '@/shared/lib/youtube-globals';

export { changeRoomVideo } from '@/features/room-player/lib/youtube-player-api';

interface YoutubePlayerProps {
  roomId: string;
  room: VideoRoom | null;
  loadedAt: number;
}

function buildEmbedSrc(videoId: string) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    origin: window.location.origin,
    widget_referrer: window.location.origin,
    playsinline: '1',
    controls: '1',
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export function YoutubePlayer({ roomId, room, loadedAt }: YoutubePlayerProps) {
  const styles = useMemo(() => createStyles(), []);
  const playerRef = useRef<YoutubePlayerInstance | null>(null);
  const playerReadyRef = useRef(false);
  const isLocalAction = useRef(false);

  const videoId = room?.youtubeVideoId ?? '';
  const [activeVideoId, setActiveVideoId] = useState(videoId);
  const iframeId = useMemo(() => `youtube-iframe-${roomId}`, [roomId]);
  const embedSrc = useMemo(
    () => (activeVideoId ? buildEmbedSrc(activeVideoId) : ''),
    [activeVideoId],
  );

  useEffect(() => {
    setActiveVideoId(videoId);
  }, [videoId]);

  const applyVideoState = useCallback((state: VideoState) => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current || isLocalAction.current) return;

    isLocalAction.current = true;
    try {
      player.seekTo(state.currentTime, true);
      if (state.isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } finally {
      setTimeout(() => {
        isLocalAction.current = false;
      }, 300);
    }
  }, []);

  const bindPlayerApi = useCallback(() => {
    void loadYouTubeAPI().then(() => {
      if (!document.getElementById(iframeId) || !window.YT?.Player) return;
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(iframeId, {
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            playerReadyRef.current = true;
            const iframe = event.target.getIframe?.();
            iframe?.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            socketService.emit('video:sync_request', roomId);
          },
          onStateChange: (event) => {
            if (isLocalAction.current || !playerReadyRef.current) return;
            const currentTime = event.target.getCurrentTime();
            isLocalAction.current = true;
            if (event.data === window.YT!.PlayerState.PLAYING) {
              socketService.emit('video:play', { roomId, currentTime });
            } else if (event.data === window.YT!.PlayerState.PAUSED) {
              socketService.emit('video:pause', { roomId, currentTime });
            }
            setTimeout(() => {
              isLocalAction.current = false;
            }, 300);
          },
        },
      });
    });
  }, [iframeId, roomId]);

  const handleIframeLoad = useCallback(() => {
    bindPlayerApi();
  }, [bindPlayerApi]);

  useEffect(() => {
    playerReadyRef.current = false;
    playerRef.current?.destroy?.();
    playerRef.current = null;
  }, [activeVideoId]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
      playerReadyRef.current = false;
    };
  }, [roomId]);

  useEffect(() => {
    const onPlay = (data: { currentTime: number }) => {
      if (isLocalAction.current || !playerRef.current || !playerReadyRef.current) return;
      isLocalAction.current = true;
      try {
        playerRef.current.seekTo(data.currentTime, true);
        playerRef.current.playVideo();
      } finally {
        setTimeout(() => {
          isLocalAction.current = false;
        }, 300);
      }
    };
    const onPause = (data: { currentTime: number }) => {
      if (isLocalAction.current || !playerRef.current || !playerReadyRef.current) return;
      isLocalAction.current = true;
      try {
        playerRef.current.seekTo(data.currentTime, true);
        playerRef.current.pauseVideo();
      } finally {
        setTimeout(() => {
          isLocalAction.current = false;
        }, 300);
      }
    };
    const onSeek = (data: { currentTime: number }) => {
      if (!playerReadyRef.current) return;
      playerRef.current?.seekTo(data.currentTime, true);
    };
    const onChange = (data: { videoId: string }) => {
      setActiveVideoId(data.videoId);
    };

    socketService.on('video:state', applyVideoState);
    socketService.on('video:play', onPlay);
    socketService.on('video:pause', onPause);
    socketService.on('video:seek', onSeek);
    socketService.on('video:sync', applyVideoState);
    socketService.on('video:change', onChange);

    return () => {
      socketService.off('video:state', applyVideoState);
      socketService.off('video:play', onPlay);
      socketService.off('video:pause', onPause);
      socketService.off('video:seek', onSeek);
      socketService.off('video:sync', applyVideoState);
      socketService.off('video:change', onChange);
    };
  }, [applyVideoState, roomId]);

  useEffect(() => {
    if (room && room.currentTime > 0 && playerReadyRef.current) {
      applyVideoState({
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        timestamp: Date.now(),
      });
    }
  }, [loadedAt, room, applyVideoState]);

  if (!activeVideoId) {
    return null;
  }

  return (
    <View style={styles.container}>
      {createElement('iframe', {
        key: activeVideoId,
        id: iframeId,
        src: embedSrc,
        title: 'YouTube',
        onLoad: handleIframeLoad,
        referrerPolicy: 'strict-origin-when-cross-origin',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: '#000',
        },
        allow:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowFullScreen: true,
      })}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      overflow: 'hidden',
    },
  });
}
