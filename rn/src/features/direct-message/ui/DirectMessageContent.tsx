import type { NavigationProp } from '@react-navigation/native';
import type { AppStackParamList } from '@/app/navigation/types';
import { parseRoomInvite } from '@/shared/lib/room-invite-message';
import { MessageText } from '@/features/direct-message/ui/MessageText';
import { RoomInviteMessage } from '@/features/direct-message/ui/RoomInviteMessage';

interface DirectMessageContentProps {
  text: string;
  isOwn?: boolean;
  createdAt?: string;
  navigation: NavigationProp<AppStackParamList>;
}

export function DirectMessageContent({
  text,
  isOwn,
  createdAt,
  navigation,
}: DirectMessageContentProps) {
  const invite = parseRoomInvite(text);

  if (invite) {
    return (
      <RoomInviteMessage
        invite={invite}
        isOwn={isOwn}
        createdAt={createdAt}
        navigation={navigation}
      />
    );
  }

  return <MessageText text={text} isOwn={isOwn} />;
}
