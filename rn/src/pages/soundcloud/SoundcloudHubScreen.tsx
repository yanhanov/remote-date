import type { AppScreenProps } from '@/app/navigation/types';
import { PlatformHub } from '@/features/room-hub/ui/PlatformHub';

export function SoundcloudHubScreen({ navigation }: AppScreenProps<'SoundcloudHub'>) {
  return <PlatformHub platform="soundcloud" navigation={navigation} />;
}
