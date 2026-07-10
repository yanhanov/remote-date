import type { AppScreenProps } from '@/app/navigation/types';
import { MessagesPage } from '@/pages/messages/MessagesPage';

export function MessagesScreen({ navigation }: AppScreenProps<'Messages'>) {
  return <MessagesPage navigation={navigation} />;
}
