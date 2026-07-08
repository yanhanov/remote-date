import type { AppScreenProps } from '@/app/navigation/types';
import { PlatformHub } from '@/features/room-hub/ui/PlatformHub';

export function YoutubeHubScreen({ navigation }: AppScreenProps<'YoutubeHub'>) {
  return <PlatformHub platform="youtube" navigation={navigation} />;
}
