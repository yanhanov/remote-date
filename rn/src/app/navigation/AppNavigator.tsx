import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppShell } from '@/app/layout/AppShell';
import { AboutScreen } from '@/pages/about/AboutScreen';
import { HomeScreen } from '@/pages/home/HomeScreen';
import { FriendsScreen } from '@/pages/friends/FriendsScreen';
import { MessagesScreen } from '@/pages/messages/MessagesScreen';
import { ProfileScreen } from '@/pages/profile/ProfileScreen';
import { YoutubeHubScreen } from '@/pages/youtube/YoutubeHubScreen';
import { SoundcloudHubScreen } from '@/pages/soundcloud/SoundcloudHubScreen';
import { BeletHubScreen } from '@/pages/belet/BeletHubScreen';
import { RoomScreen } from '@/pages/room/RoomScreen';
import { SoundRoomScreen } from '@/pages/room/SoundRoomScreen';
import { BeletRoomScreen } from '@/pages/room/BeletRoomScreen';
import { UserProfileScreen } from '@/pages/user/UserProfileScreen';
import { MessagesThreadScreen } from '@/pages/messages/MessagesThreadScreen';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const { colors } = useTheme();

  return (
    <AppShell>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Friends" component={FriendsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
        <Stack.Screen name="YoutubeHub" component={YoutubeHubScreen} options={{ title: 'YouTube' }} />
        <Stack.Screen
          name="SoundcloudHub"
          component={SoundcloudHubScreen}
          options={{ title: 'SoundCloud' }}
        />
        <Stack.Screen name="BeletHub" component={BeletHubScreen} options={{ title: 'Belet' }} />
        <Stack.Screen name="Room" component={RoomScreen} options={{ title: 'Watch party' }} />
        <Stack.Screen name="SoundRoom" component={SoundRoomScreen} options={{ title: 'SoundCloud Room' }} />
        <Stack.Screen
          name="BeletRoom"
          component={BeletRoomScreen}
          options={{ title: 'Belet Room', headerShown: false }}
        />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen
          name="MessagesThread"
          component={MessagesThreadScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </AppShell>
  );
}
