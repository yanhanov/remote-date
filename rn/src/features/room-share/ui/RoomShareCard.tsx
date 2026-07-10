import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { UserPlus } from 'phosphor-react-native';
import { Button } from '@/shared/ui/Button';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import type { RoomType } from '@/shared/api/room.types';
import { RoomInviteModal } from '@/features/room-share/ui/RoomInviteModal';

interface RoomShareCardProps {
  roomId: string;
  roomType: RoomType;
}

export function RoomShareCard({ roomId, roomType }: RoomShareCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <View style={styles.card}>
      <Button
        title="Invite participant"
        variant="outline"
        onPress={() => setInviteOpen(true)}
        icon={<UserPlus size={16} color={colors.foreground} />}
      />

      <RoomInviteModal
        visible={inviteOpen}
        roomId={roomId}
        roomType={roomType}
        onClose={() => setInviteOpen(false)}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
  });
}
