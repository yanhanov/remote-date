import { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/entities/user/model/auth.store';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { linking } from './linking';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { initialize, isAuthenticated, isInitialized } = useAuth();
  const { isDark, colors } = useTheme();
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    void initialize().finally(() => setBootstrapping(false));
  }, [initialize]);

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.foreground,
          border: colors.border,
          primary: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.foreground,
          border: colors.border,
          primary: colors.primary,
        },
      };

  return (
    <NavigationContainer linking={linking} theme={navTheme}>
      {bootstrapping || !isInitialized ? (
        <LoadingSpinner />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="AppStack" component={AppNavigator} />
          ) : (
            <Stack.Screen name="AuthStack" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
