import type { AppScreenProps } from '@/app/navigation/types';
import { MessagesPage } from '@/pages/messages/MessagesPage';
import { useResponsive } from '@/shared/lib/use-responsive';

export function MessagesThreadScreen({
  route,
  navigation,
}: AppScreenProps<'MessagesThread'>) {
  const { isLg } = useResponsive();

  return (
    <MessagesPage
      userId={route.params.userId}
      navigation={navigation}
      threadOnly={!isLg}
    />
  );
}
