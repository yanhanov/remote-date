import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { authAPI } from '@/shared/api/auth.api';
import { useAuth } from '@/entities/user/model/auth.store';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

interface LoginFormProps {
  onRegister: () => void;
}

export function LoginForm({ onRegister }: LoginFormProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { refreshUser } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);

    if (!login.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.login({ login: login.trim(), password });
      await refreshUser();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      Alert.alert('Login failed', message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card title="Welcome back" description="Sign in to continue watching together">
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.label}>Email or username</Text>
        <Input
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email or username"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
        />
      </View>

      <Button title={isLoading ? 'Logging in...' : 'Login'} loading={isLoading} onPress={handleLogin} />

      <Pressable onPress={onRegister} style={styles.switch}>
        <Text style={styles.switchText}>
          Don't have an account? <Text style={styles.switchLink}>Register</Text>
        </Text>
      </Pressable>
    </Card>
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
