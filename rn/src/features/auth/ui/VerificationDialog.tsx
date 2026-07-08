import { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { authAPI } from '@/shared/api/auth.api';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface VerificationDialogProps {
  visible: boolean;
  email: string;
  onClose: () => void;
  onVerified: () => void;
}

export function VerificationDialog({
  visible,
  email,
  onClose,
  onVerified,
}: VerificationDialogProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authAPI.registerCheck({ email, code: trimmed });
      onVerified();
      setCode('');
      Alert.alert('Success', 'Email verified');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid verification code';
      setError(message);
      setCode('');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.description}>
            We've sent a verification code to <Text style={styles.email}>{email}</Text>
          </Text>

          <Text style={styles.label}>Verification code</Text>
          <Input
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder="000000"
            maxLength={6}
            style={styles.codeInput}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={styles.actionBtn} />
            <Button
              title={isLoading ? 'Verifying...' : 'Verify'}
              loading={isLoading}
              onPress={handleVerify}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    dialog: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 20,
      lineHeight: 20,
    },
    email: {
      fontWeight: '600',
      color: colors.foreground,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 6,
      color: colors.foreground,
    },
    codeInput: {
      textAlign: 'center',
      fontSize: 24,
      letterSpacing: 8,
      fontWeight: '700',
    },
    error: {
      color: colors.destructive,
      fontSize: 13,
      marginTop: 8,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    actionBtn: {
      flex: 1,
    },
  });
}
