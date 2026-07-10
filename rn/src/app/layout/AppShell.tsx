import { useMemo, type PropsWithChildren } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppSidebar } from '@/widgets/app-sidebar/AppSidebar';
import { AppBreadcrumbs } from '@/widgets/app-breadcrumbs/AppBreadcrumbs';
import { MobileNav } from '@/widgets/mobile-nav/MobileNav';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import { useResponsive } from '@/shared/lib/use-responsive';
import { useAppNav } from '@/widgets/app-nav/use-app-nav';

export function AppShell({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const { isWide } = useResponsive();
  const { routeName } = useAppNav();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hideMobileNav =
    routeName === 'BeletRoom' || routeName === 'MessagesThread';

  return (
    <View style={styles.root}>
      {isWide ? <AppSidebar /> : null}

      <View style={styles.main}>
        {isWide ? (
          <View style={styles.desktopHeader}>
            <AppBreadcrumbs />
            <ThemeToggle />
          </View>
        ) : null}

        <View style={styles.content}>{children}</View>

        {!isWide && !hideMobileNav ? <MobileNav /> : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.background,
    },
    main: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
    },
    desktopHeader: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: `${colors.background}CC`,
    },
    content: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
  });
}
