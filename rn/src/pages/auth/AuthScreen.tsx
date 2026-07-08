import { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LoginForm } from '@/features/auth/ui/LoginForm';
import { RegisterForm } from '@/features/auth/ui/RegisterForm';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { createCommonStyles } from '@/shared/theme/styles';

export function AuthScreen() {
  const { colors } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const [tab, setTab] = useState<'login' | 'register'>('login');

  return (
    <View style={[commonStyles.screen, styles.container]}>
      <Text style={commonStyles.eyebrow}>Remote Date</Text>
      <Text style={commonStyles.title}>Welcome</Text>
      <Text style={[commonStyles.subtitle, styles.subtitle]}>
        Sign in or create an account to watch together.
      </Text>

      {tab === 'login' ? (
        <LoginForm onRegister={() => setTab('register')} />
      ) : (
        <RegisterForm onLogin={() => setTab('login')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
  },
  subtitle: {
    marginBottom: 24,
  },
});
