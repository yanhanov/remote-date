import type { AppScreenProps } from '@/app/navigation/types';
import { PlatformHub } from '@/features/room-hub/ui/PlatformHub';

export function BeletHubScreen({ navigation }: AppScreenProps<'BeletHub'>) {
  return <PlatformHub platform="belet" navigation={navigation} />;
}
