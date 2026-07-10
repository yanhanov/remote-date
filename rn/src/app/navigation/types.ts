import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Auth: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Friends: undefined;
  Messages: undefined;
  Profile: undefined;
  About: undefined;
  YoutubeHub: undefined;
  SoundcloudHub: undefined;
  BeletHub: undefined;
  Room: { id: string };
  SoundRoom: { id: string };
  BeletRoom: { id: string };
  UserProfile: { id: string };
  MessagesThread: { userId: string };
};

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList> | undefined;
  AppStack: NavigatorScreenParams<AppStackParamList> | undefined;
};

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>;
