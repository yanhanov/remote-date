import React, {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { StyleSheet, View } from 'react-native';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isLocalAction = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      load(url: string) {
        const audio = audioRef.current;
        if (!audio) return;
        isLocalAction.current = true;
        audio.src = url;
        audio.load();
        void audio.play().finally(() => {
          setTimeout(() => {
            isLocalAction.current = false;
          }, 300);
        });
      },
      sync(currentTime: number, isPlaying: boolean) {
        const audio = audioRef.current;
        if (!audio) return;
        isLocalAction.current = true;
        audio.currentTime = currentTime;
        if (isPlaying) {
          void audio.play();
        } else {
          audio.pause();
        }
        setTimeout(() => {
          isLocalAction.current = false;
        }, 300);
      },
    }),
    [],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      if (isLocalAction.current) return;
      onPlay?.(audio.currentTime);
    };
    const handlePause = () => {
      if (isLocalAction.current) return;
      onPause?.(audio.currentTime);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [onPlay, onPause, streamUrl]);

  return (
    <View style={styles.player}>
      {createElement('audio', {
        ref: audioRef,
        controls: true,
        autoPlay: true,
        src: streamUrl,
        style: {
          width: '100%',
          maxWidth: 400,
        },
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  player: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
