import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { socketService } from '@/shared/api/socket.service';
import type { VideoRoom } from '@/shared/api/room.types';
import { BELET_HOME_URL } from '@/shared/lib/belet-url';
import { Button } from '@/shared/ui/Button';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import {
  changeRoomBelet,
  type BeletPlayerHandle,
} from '@/features/room-player/lib/belet-player-api';

export { changeRoomBelet, type BeletPlayerHandle };

interface BeletPlayerProps {
  roomId: string;
  room: VideoRoom | null;
  loadedAt: number;
}

export const BeletPlayer = forwardRef<BeletPlayerHandle, BeletPlayerProps>(function BeletPlayer(
  { room },
  ref,
) {
  useImperativeHandle(ref, () => ({ goBack: () => false }), []);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [contentUrl, setContentUrl] = useState(room?.beletUrl ?? BELET_HOME_URL);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    setContentUrl(room?.beletUrl ?? BELET_HOME_URL);
  }, [room?.beletUrl]);

  useEffect(() => {
    const onChange = (data: { beletUrl: string }) => {
      setContentUrl(data.beletUrl);
      setUpdatedAt(Date.now());
    };

    socketService.on('belet:change', onChange);
    return () => socketService.off('belet:change', onChange);
  }, []);

  async function openBelet() {
    await Linking.openURL(contentUrl);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Open Belet in a new tab</Text>
      <Text style={styles.body}>
        Belet does not allow embedding in other websites. Open the shared link in a new tab, sign
        in with your account, and watch there. Chat and link updates stay in this room — play/pause
        sync works in the mobile app.
      </Text>

      {updatedAt ? (
        <Text style={styles.notice}>Room link was updated — open it again to catch up.</Text>
      ) : null}

      <Text style={styles.url} numberOfLines={2}>
        {contentUrl}
      </Text>

      <Button title="Open Belet in new tab" onPress={() => void openBelet()} style={styles.button} />
    </View>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: '#111',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 28,
      gap: 12,
    },
    title: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    body: {
      color: '#ffffffcc',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 480,
    },
    notice: {
      color: colors.belet,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    url: {
      color: '#ffffff99',
      fontSize: 12,
      textAlign: 'center',
      maxWidth: 520,
    },
    button: {
      marginTop: 4,
      backgroundColor: colors.belet,
      minWidth: 220,
    },
  });
}
