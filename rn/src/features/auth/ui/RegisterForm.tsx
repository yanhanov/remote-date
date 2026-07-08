import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { authAPI } from '@/shared/api/auth.api';
import { useAuth } from '@/entities/user/model/auth.store';
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_HINT,
} from '@/shared/lib/username';
import { VerificationDialog } from './VerificationDialog';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface RegisterFormProps {
  onLogin: () => void;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function RegisterForm({ onLogin }: RegisterFormProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);

  useEffect(() => {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      setUsernameStatus('idle');
      setUsernameMessage(null);
      return;
    }

    if (!isValidUsername(normalized)) {
      setUsernameStatus('invalid');
      setUsernameMessage(USERNAME_HINT);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      setUsernameMessage(null);
      try {
        const result = await authAPI.checkUsername(normalized);
        if (result.available) {
          setUsernameStatus('available');
          setUsernameMessage('Username is available');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(result.reason ?? 'Username is already taken');
        }
      } catch {
        setUsernameStatus('idle');
        setUsernameMessage(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const isUsernameBlocked =
    usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking';

  async function handleRegister() {
    setError(null);

    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setError(USERNAME_HINT);
      return;
    }

    if (usernameStatus === 'taken') {
      setError(usernameMessage ?? 'Username is already taken');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.register({
        email,
        username: normalizedUsername,
        password,
      });
      setRegisteredEmail(email);
      setShowVerification(true);
      Alert.alert('Check your email', 'Verification code sent to your email');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      Alert.alert('Registration failed', message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerified() {
    await refreshUser();
    setShowVerification(false);
  }

  return (
    <>
      <Card title="Create account" description="Join and start watching together">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <Input
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="yourname"
          />
          {usernameMessage ? (
            <Text
              style={[
                styles.hint,
                usernameStatus === 'available' && styles.hintSuccess,
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.hintError,
              ]}
            >
              {usernameMessage}
            </Text>
          ) : (
            <Text style={styles.hint}>Letters, numbers, underscores. 3–30 characters.</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Confirm password</Text>
          <Input
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm password"
          />
        </View>

        <Button
          title={isLoading ? 'Registering...' : 'Register'}
          loading={isLoading}
          disabled={isUsernameBlocked}
          onPress={handleRegister}
        />

        <Pressable onPress={onLogin} style={styles.switch}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Login</Text>
          </Text>
        </Pressable>
      </Card>

      <VerificationDialog
        visible={showVerification}
        email={registeredEmail}
        onClose={() => setShowVerification(false)}
        onVerified={handleVerified}
      />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    field: {
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.foreground,
      marginBottom: 6,
    },
    hint: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 4,
    },
    hintSuccess: {
      color: colors.success,
    },
    hintError: {
      color: colors.destructive,
    },
    error: {
      color: colors.destructive,
      backgroundColor: colors.destructiveBg,
      padding: 10,
      borderRadius: 8,
      marginBottom: 12,
      fontSize: 13,
    },
    switch: {
      marginTop: 16,
      alignItems: 'center',
    },
    switchText: {
      fontSize: 14,
      color: colors.muted,
    },
    switchLink: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
