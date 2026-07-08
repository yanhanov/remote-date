import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList, RootStackParamList } from '@/app/navigation/types';

export function useAppNavigation() {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  function navigate<Route extends keyof AppStackParamList>(
    ...args: undefined extends AppStackParamList[Route]
      ? [screen: Route] | [screen: Route, params: AppStackParamList[Route]]
      : [screen: Route, params: AppStackParamList[Route]]
  ) {
    const [screen, params] = args;
    rootNavigation.navigate('AppStack', { screen, params } as never);
  }

  return { navigate };
}
