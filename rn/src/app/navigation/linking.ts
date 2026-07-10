import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

function webOrigin(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  return window.location.origin;
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'remotedate://',
    ...(webOrigin() ? [webOrigin()!] : []),
    'https://remote-date.app',
  ],
  config: {
    screens: {
      AuthStack: {
        path: 'auth',
        screens: {
          Auth: '',
        },
      },
      AppStack: {
        screens: {
          Home: '',
          About: 'about',
          YoutubeHub: 'youtube',
          SoundcloudHub: 'soundcloud',
          BeletHub: 'belet',
          Room: 'room/:id',
          SoundRoom: 'sound-room/:id',
          BeletRoom: 'belet-room/:id',
          Friends: 'friends',
          Profile: 'profile',
          Messages: 'messages',
          UserProfile: 'users/:id',
          MessagesThread: 'messages/:userId',
        },
      },
    },
  },
};
