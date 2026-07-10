import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

const WebViewAny = WebView as unknown as React.ComponentType<Record<string, unknown>>;

function buildAudioHtml(streamUrl: string) {
  const escaped = streamUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
<audio id="audio" controls autoplay style="width:100%;max-width:400px;">
<source src="${escaped}" type="audio/mpeg" />
</audio>
<script>
const audio = document.getElementById('audio');
audio.addEventListener('play', () => post('play', { currentTime: audio.currentTime }));
audio.addEventListener('pause', () => post('pause', { currentTime: audio.currentTime }));
audio.addEventListener('seeked', () => post('seek', { currentTime: audio.currentTime }));
function post(type, data) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
}
document.addEventListener('message', handle);
window.addEventListener('message', handle);
function handle(event) {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'sync') {
      audio.currentTime = data.currentTime || 0;
      if (data.isPlaying) audio.play(); else audio.pause();
    } else if (data.type === 'load') {
      audio.src = data.streamUrl;
      audio.load();
      audio.play();
    }
  } catch(e) {}
}
</script>
</body></html>`;
}

export interface SoundcloudAudioPlayerRef {
  load(streamUrl: string): void;
  sync(currentTime: number, isPlaying: boolean): void;
}

interface SoundcloudAudioPlayerProps {
  streamUrl: string;
  onPlay?: (currentTime: number) => void;
  onPause?: (currentTime: number) => void;
}

export const SoundcloudAudioPlayer = forwardRef<
  SoundcloudAudioPlayerRef,
  SoundcloudAudioPlayerProps
>(function SoundcloudAudioPlayer({ streamUrl, onPlay, onPause }, ref) {
  const webRef = useRef<WebView>(null);

  useImperativeHandle(
    ref,
    () => ({
      load(url: string) {
        webRef.current?.postMessage(JSON.stringify({ type: 'load', streamUrl: url }));
      },
      sync(currentTime: number, isPlaying: boolean) {
        webRef.current?.postMessage(JSON.stringify({ type: 'sync', currentTime, isPlaying }));
      },
    }),
    [],
  );

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type: string;
        currentTime?: number;
      };
      if (data.type === 'play') {
        onPlay?.(data.currentTime ?? 0);
      } else if (data.type === 'pause') {
        onPause?.(data.currentTime ?? 0);
      }
    } catch {
      // ignore
    }
  }

  return (
    <WebViewAny
      ref={webRef}
      source={{ html: buildAudioHtml(streamUrl) }}
      style={styles.webview}
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      onMessage={onMessage}
    />
  );
});

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#111',
  },
});
