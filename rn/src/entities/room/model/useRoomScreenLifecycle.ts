import { useEffect } from 'react';
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
  useEffect(() => {
    void (async () => {
      try {
        await load();
        join();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load room';
        setError(message);
        Alert.alert('Error', message);
      }
    })();

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      leave();
    });

    return unsubscribe;
  }, [roomId, navigation, load, join, leave, setError]);
}
