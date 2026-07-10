import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { socketService } from '@/shared/api/socket.service';
import type { VideoRoom, VideoState } from '@/shared/api/room.types';
import { BELET_HOME_URL } from '@/shared/lib/belet-url';
import { restoreBeletCookies, saveBeletCookies } from '@/shared/lib/belet-session';
import { BeletLoginOverlay } from '@/features/room-player/ui/BeletLoginOverlay';
import {
  changeRoomBelet,
  type BeletPlayerHandle,
} from '@/features/room-player/lib/belet-player-api';

export { changeRoomBelet, type BeletPlayerHandle };

const WebViewAny = WebView as unknown as React.ComponentType<Record<string, unknown>>;

// Belet redirects mobile/Android/iPhone UAs to /mobile ("download the app").
// Force a desktop browser UA so the full web player loads in WebView.
const BELET_DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const BRIDGE_SCRIPT = `
(function() {
  if (window.__beletBridgeInstalled) return;
  window.__beletBridgeInstalled = true;

  let isLocalAction = false;
  let video = null;

  function post(type, data) {
    if (!window.ReactNativeWebView) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
  }

  function isLoginPage() {
    const path = window.location.pathname.toLowerCase();
    return /login|auth|sign-in|otp|register/.test(path);
  }

  function detectSession() {
    if (!isLoginPage()) {
      post('session_active', {});
    }
  }

  function attachVideo(element) {
    if (!element || element === video) return;
    video = element;
    post('video_found', {});

    element.addEventListener('play', function() {
      if (isLocalAction) return;
      post('play', { currentTime: element.currentTime });
    });
    element.addEventListener('pause', function() {
      if (isLocalAction) return;
      post('pause', { currentTime: element.currentTime });
    });
    element.addEventListener('seeked', function() {
      if (isLocalAction) return;
      post('seek', { currentTime: element.currentTime });
    });
  }

  function findVideo() {
    const element = document.querySelector('video');
    if (element) attachVideo(element);
  }

  const observer = new MutationObserver(findVideo);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  findVideo();

  function handleCommand(data) {
    if (data.type === 'navigate' && data.url) {
      window.location.href = data.url;
      return;
    }

    if (data.type === 'history_back') {
      if (window.history.length > 1) {
        window.history.back();
      }
      return;
    }

    if (!video) return;

    isLocalAction = true;
    try {
      if (data.type === 'play') {
        if (data.currentTime != null) video.currentTime = data.currentTime;
        void video.play();
      } else if (data.type === 'pause') {
        if (data.currentTime != null) video.currentTime = data.currentTime;
        video.pause();
      } else if (data.type === 'seek') {
        video.currentTime = data.currentTime;
      } else if (data.type === 'sync') {
        video.currentTime = data.currentTime;
        if (data.isPlaying) void video.play();
        else video.pause();
      }
    } finally {
      setTimeout(function() { isLocalAction = false; }, 300);
    }
  }

  document.addEventListener('message', function(event) {
    try { handleCommand(JSON.parse(event.data)); } catch (e) {}
  });
  window.addEventListener('message', function(event) {
    try { handleCommand(JSON.parse(event.data)); } catch (e) {}
  });

  post('ready', {
    url: window.location.href,
    isLoginPage: isLoginPage()
  });
  detectSession();
})();
true;
`;

interface BeletPlayerProps {
  roomId: string;
  room: VideoRoom | null;
  loadedAt: number;
}

export const BeletPlayer = forwardRef<BeletPlayerHandle, BeletPlayerProps>(
  function BeletPlayer({ roomId, room, loadedAt }, ref) {
    const styles = useMemo(() => createStyles(), []);
    const webRef = useRef<WebView>(null);
    const isLocalAction = useRef(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const canGoBackRef = useRef(false);
    const spaBackAttemptedRef = useRef(false);
    const [cookiesReady, setCookiesReady] = useState(false);
    const [showLoginHint, setShowLoginHint] = useState(true);

    const contentUrl = room?.beletUrl ?? BELET_HOME_URL;
    const initialUrl = useRef(room?.beletUrl ?? BELET_HOME_URL).current;

    const postToPlayer = useCallback((data: object) => {
      webRef.current?.postMessage(JSON.stringify(data));
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        goBack() {
          if (canGoBackRef.current) {
            spaBackAttemptedRef.current = false;
            webRef.current?.goBack();
            return true;
          }
          // Next.js client routes sometimes skip WebView canGoBack — try once via history.
          if (!spaBackAttemptedRef.current) {
            spaBackAttemptedRef.current = true;
            postToPlayer({ type: 'history_back' });
            return true;
          }
          spaBackAttemptedRef.current = false;
          return false;
        },
      }),
      [postToPlayer],
    );

    useEffect(() => {
      let cancelled = false;

      void restoreBeletCookies().finally(() => {
        if (!cancelled) {
          setCookiesReady(true);
        }
      });

      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      if (!cookiesReady) return;
      postToPlayer({ type: 'navigate', url: contentUrl });
    }, [contentUrl, cookiesReady, postToPlayer]);

    const scheduleSaveCookies = useCallback(() => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(() => {
        void saveBeletCookies();
      }, 500);
    }, []);

    useEffect(
      () => () => {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current);
        }
      },
      [],
    );

    useEffect(() => {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'background') {
          void saveBeletCookies();
        }
      });
      return () => subscription.remove();
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
      const onChange = (data: { beletUrl: string }) => {
        postToPlayer({ type: 'navigate', url: data.beletUrl });
      };

      socketService.on('video:state', handleVideoState);
      socketService.on('video:play', onPlay);
      socketService.on('video:pause', onPause);
      socketService.on('video:seek', onSeek);
      socketService.on('video:sync', handleVideoState);
      socketService.on('belet:change', onChange);

      return () => {
        socketService.off('video:state', handleVideoState);
        socketService.off('video:play', onPlay);
        socketService.off('video:pause', onPause);
        socketService.off('video:seek', onSeek);
        socketService.off('video:sync', handleVideoState);
        socketService.off('belet:change', onChange);
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
          isLoginPage?: boolean;
        };

        if (data.type === 'ready') {
          setShowLoginHint(Boolean(data.isLoginPage));
          if (!data.isLoginPage) {
            scheduleSaveCookies();
          }
          if (room) {
            postToPlayer({
              type: 'sync',
              currentTime: room.currentTime ?? 0,
              isPlaying: room.isPlaying ?? false,
            });
          }
          socketService.emit('video:sync_request', roomId);
          return;
        }

        if (data.type === 'video_found' || data.type === 'session_active') {
          setShowLoginHint(false);
          if (data.type === 'session_active') {
            scheduleSaveCookies();
          }
          return;
        }

        isLocalAction.current = true;
        if (data.type === 'play') {
          socketService.emit('video:play', { roomId, currentTime: data.currentTime });
        } else if (data.type === 'pause') {
          socketService.emit('video:pause', { roomId, currentTime: data.currentTime });
        } else if (data.type === 'seek') {
          if (data.currentTime != null) {
            socketService.emit('video:seek', { roomId, currentTime: data.currentTime });
          }
        }
        setTimeout(() => {
          isLocalAction.current = false;
        }, 300);
      } catch {
        // ignore malformed bridge messages
      }
    }

    return (
      <View style={styles.container}>
        {cookiesReady ? (
          <WebViewAny
            ref={webRef}
            source={{ uri: initialUrl }}
            style={styles.webview}
            userAgent={BELET_DESKTOP_USER_AGENT}
            applicationNameForUserAgent=""
            incognito={false}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            setSupportMultipleWindows={false}
            keyboardDisplayRequiresUserAction={false}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            injectedJavaScript={BRIDGE_SCRIPT}
            onMessage={onMessage}
            onLoadEnd={scheduleSaveCookies}
            onNavigationStateChange={(navState: { url?: string; canGoBack?: boolean }) => {
              const canGoBack = Boolean(navState?.canGoBack);
              canGoBackRef.current = canGoBack;
              if (canGoBack) {
                spaBackAttemptedRef.current = false;
              }
              scheduleSaveCookies();
              const url = navState?.url ?? '';
              if (/\/mobile(\?|$)/i.test(url)) {
                postToPlayer({ type: 'navigate', url: contentUrl });
              }
            }}
            onShouldStartLoadWithRequest={(request: { url?: string }) => {
              const url = request?.url ?? '';
              if (/\/mobile(\?|$)/i.test(url)) {
                postToPlayer({ type: 'navigate', url: contentUrl });
                return false;
              }
              return true;
            }}
          />
        ) : (
          <View style={styles.webview} />
        )}

        {showLoginHint ? (
          <BeletLoginOverlay onDismiss={() => setShowLoginHint(false)} />
        ) : null}
      </View>
    );
  },
);

function createStyles() {
  return StyleSheet.create({
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
}
