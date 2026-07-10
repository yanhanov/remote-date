import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface BeletLoginOverlayProps {
  onDismiss: () => void;
  webHint?: boolean;
}

/** Non-blocking hint chip — does not cover the Belet WebView login UI. */
export function BeletLoginOverlay({ onDismiss, webHint }: BeletLoginOverlayProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.top),
    [colors, insets.top],
  );

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.chip}>
        <View style={styles.chipText}>
          <Text style={styles.title}>Sign in inside Belet</Text>
          <Text style={styles.body}>
            {webHint
              ? 'Use the mobile app for the best Belet login experience.'
              : 'Log in with your Belet account below. Session is saved on this device.'}
          </Text>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          style={({ pressed }) => [styles.dismiss, pressed && styles.dismissPressed]}
          accessibilityLabel="Dismiss login hint"
        >
          <X size={16} color="#fff" weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, topInset: number) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 12,
      right: 12,
      // Sit just below the Belet room top chrome (safe area + bar).
      top: topInset + 52,
      zIndex: 5,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.82)',
      borderWidth: 1,
      borderColor: `${colors.belet}66`,
    },
    chipText: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    title: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    body: {
      color: '#ffffffcc',
      fontSize: 12,
      lineHeight: 16,
    },
    dismiss: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    dismissPressed: {
      opacity: 0.7,
    },
  });
}
