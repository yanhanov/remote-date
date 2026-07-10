import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { House, Users, ChatCircle } from 'phosphor-react-native';
import { useAppNavigation } from '@/app/navigation/use-app-navigation';
import { useAuth } from '@/entities/user/model/auth.store';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import { YouTubeIcon, SoundCloudIcon, BeletIcon } from '@/shared/ui/icons/PlatformIcons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import { useAppNav } from '@/widgets/app-nav/use-app-nav';

const SIDEBAR_WIDTH = 240;

const watchItems = [
  { title: 'Home', route: 'Home' as const, Icon: House },
  { title: 'YouTube', route: 'YoutubeHub' as const, Icon: YouTubeIcon, isBrand: true },
  { title: 'SoundCloud', route: 'SoundcloudHub' as const, Icon: SoundCloudIcon, isBrand: true },
  { title: 'Belet', route: 'BeletHub' as const, Icon: BeletIcon, isBrand: true },
];

const socialItems = [
  { title: 'Friends', route: 'Friends' as const, Icon: Users },
  { title: 'Messages', route: 'Messages' as const, Icon: ChatCircle },
];

export function AppSidebar() {
  const { navigate } = useAppNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isNavActive } = useAppNav();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayName = user
    ? user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email
    : 'Guest';

  function renderNavItem(item: (typeof watchItems)[number] | (typeof socialItems)[number]) {
    const active = isNavActive(item.route);
    const Icon = item.Icon;

    return (
      <Pressable
        key={item.route}
        onPress={() => navigate(item.route)}
        style={[styles.navItem, active && styles.navItemActive]}
      >
        {'isBrand' in item && item.isBrand ? (
          <Icon size={18} />
        ) : (
          <Icon size={18} color={active ? colors.primary : colors.muted} weight="duotone" />
        )}
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.title}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.sidebar}>
      <Pressable onPress={() => navigate('Home')} style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <View style={styles.logoDot} />
        </View>
        <Text style={styles.logoText}>Remote Date</Text>
      </Pressable>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>Watch</Text>
        {watchItems.map(renderNavItem)}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Social</Text>
        {socialItems.map(renderNavItem)}
      </ScrollView>

      {user ? (
        <Pressable
          onPress={() => navigate('Profile')}
          style={[styles.profileRow, isNavActive('Profile') && styles.navItemActive]}
        >
          <UserAvatar user={user} size="sm" />
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileHint} numberOfLines={1}>
              Profile
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export const APP_SIDEBAR_WIDTH = SIDEBAR_WIDTH;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sidebar: {
      width: SIDEBAR_WIDTH,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
      backgroundColor: colors.background,
      paddingTop: 12,
      paddingBottom: 12,
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 12,
      marginBottom: 16,
      padding: 8,
      borderRadius: 12,
    },
    logoIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: `${colors.primary}1A`,
      borderWidth: 1,
      borderColor: `${colors.primary}33`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    logoText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.2,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 12,
      gap: 4,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: colors.muted,
      marginBottom: 8,
      paddingHorizontal: 8,
    },
    sectionLabelSpaced: {
      marginTop: 16,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    navItemActive: {
      backgroundColor: `${colors.primary}1A`,
    },
    navLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.muted,
    },
    navLabelActive: {
      color: colors.primary,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 12,
      marginTop: 8,
      padding: 10,
      borderRadius: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    profileText: {
      flex: 1,
      minWidth: 0,
    },
    profileName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    profileHint: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
  });
}
