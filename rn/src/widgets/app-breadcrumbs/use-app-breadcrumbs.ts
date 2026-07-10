import { useMemo } from 'react';
import { useNavigationState, type NavigationState, type PartialState } from '@react-navigation/native';
import type { AppStackParamList } from '@/app/navigation/types';

export type BreadcrumbItem = {
  label: string;
  route?: keyof AppStackParamList;
};

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

function buildBreadcrumbs(routeName: string): BreadcrumbItem[] {
  if (routeName === 'Home') {
    return [{ label: 'Home' }];
  }

  const crumbs: BreadcrumbItem[] = [{ label: 'Home', route: 'Home' }];

  switch (routeName) {
    case 'About':
      crumbs.push({ label: 'About' });
      break;
    case 'YoutubeHub':
      crumbs.push({ label: 'YouTube' });
      break;
    case 'Room':
      crumbs.push({ label: 'YouTube', route: 'YoutubeHub' });
      crumbs.push({ label: 'Room' });
      break;
    case 'SoundcloudHub':
      crumbs.push({ label: 'SoundCloud' });
      break;
    case 'SoundRoom':
      crumbs.push({ label: 'SoundCloud', route: 'SoundcloudHub' });
      crumbs.push({ label: 'Room' });
      break;
    case 'BeletHub':
      crumbs.push({ label: 'Belet' });
      break;
    case 'BeletRoom':
      crumbs.push({ label: 'Belet', route: 'BeletHub' });
      crumbs.push({ label: 'Room' });
      break;
    case 'Profile':
      crumbs.push({ label: 'Profile' });
      break;
    case 'UserProfile':
      crumbs.push({ label: 'Friends', route: 'Friends' });
      crumbs.push({ label: 'Profile' });
      break;
    case 'Friends':
      crumbs.push({ label: 'Friends' });
      break;
    case 'Messages':
    case 'MessagesThread':
      crumbs.push({ label: 'Messages' });
      break;
    default:
      crumbs.push({ label: 'Page' });
  }

  return crumbs;
}

export function useAppBreadcrumbs() {
  const routeName = useNavigationState(getActiveRouteName);
  const items = useMemo(() => buildBreadcrumbs(routeName), [routeName]);

  return { items, routeName };
}
