import { useNavigationState, type NavigationState, type PartialState } from '@react-navigation/native';
import type { AppStackParamList } from '@/app/navigation/types';

export type AppNavTarget = keyof Pick<
  AppStackParamList,
  'Home' | 'YoutubeHub' | 'SoundcloudHub' | 'Friends' | 'Messages' | 'Profile'
>;

function getActiveRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined,
): string {
  if (!state) return 'Home';

  const route = state.routes[state.index ?? 0];

  if (route.name === 'AppStack' && route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }

  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }

  return route.name;
}

export function useAppNav() {
  const routeName = useNavigationState(getActiveRouteName);

  function isNavActive(target: AppNavTarget): boolean {
    switch (target) {
      case 'Home':
        return routeName === 'Home';
      case 'YoutubeHub':
        return routeName === 'YoutubeHub' || routeName === 'Room';
      case 'SoundcloudHub':
        return routeName === 'SoundcloudHub' || routeName === 'SoundRoom';
      case 'Messages':
        return routeName === 'Messages' || routeName === 'MessagesThread';
      case 'Friends':
        return routeName === 'Friends' || routeName === 'UserProfile';
      case 'Profile':
        return routeName === 'Profile';
      default:
        return routeName === target;
    }
  }

  return { isNavActive, routeName };
}
