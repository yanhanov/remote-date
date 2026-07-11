import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

interface RoomLifecycleHandlers {
  load: () => Promise<void>;
  join: () => void;
  leave: () => void;
  setError: (message: string) => void;
}

export function useRoomScreenLifecycle(
  roomId: string,
  navigation: NavigationProp<ParamListBase>,
  { load, join, leave, setError }: RoomLifecycleHandlers,
) {
  const handlersRef = useRef({ load, join, leave, setError });
  handlersRef.current = { load, join, leave, setError };
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await handlersRef.current.load();
        if (!cancelled) handlersRef.current.join();
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load room';
        handlersRef.current.setError(message);
        Alert.alert('Error', message);
      }
    })();

    const unsubscribe = navigationRef.current.addListener('beforeRemove', () => {
      handlersRef.current.leave();
    });

    return () => {
      cancelled = true;
      unsubscribe();
      handlersRef.current.leave();
    };
    // Only re-run when the room id changes — unstable load/join/navigation
    // identities were remounting the player (loading spinner).
  }, [roomId]);
}
