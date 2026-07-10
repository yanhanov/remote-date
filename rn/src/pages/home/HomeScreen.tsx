import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ArrowUpRight } from 'phosphor-react-native';
import type { AppScreenProps } from '@/app/navigation/types';
import { YouTubeIcon, SoundCloudIcon, BeletIcon } from '@/shared/ui/icons/PlatformIcons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { createCommonStyles } from '@/shared/theme/styles';
import type { ThemeColors } from '@/shared/theme/colors';

export function HomeScreen({ navigation }: AppScreenProps<'Home'>) {
  const { colors } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const platforms = useMemo(
    () => [
      {
        title: 'YouTube',
        tagline: 'Video rooms',
        description: 'Pick a video and watch in perfect sync.',
        route: 'YoutubeHub' as const,
        color: colors.youtube,
        Icon: YouTubeIcon,
      },
      {
        title: 'SoundCloud',
        tagline: 'Music rooms',
        description: 'Queue tracks and listen together live.',
        route: 'SoundcloudHub' as const,
        color: colors.soundcloud,
        Icon: SoundCloudIcon,
      },
      {
        title: 'Belet',
        tagline: 'Movies & series',
        description: 'Watch Belet together with synced playback.',
        route: 'BeletHub' as const,
        color: colors.belet,
        Icon: BeletIcon,
      },
    ],
    [colors],
  );

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={styles.content}>
      <Text style={commonStyles.eyebrow}>Watch together</Text>
      <Text style={commonStyles.title}>Remote Date</Text>
      <Text style={commonStyles.subtitle}>
        Pick a platform, create a room, and share the link with someone special.
      </Text>

      <View style={styles.nav}>
        {platforms.map((platform) => {
          const Icon = platform.Icon;
          return (
            <Pressable
              key={platform.route}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate(platform.route)}
            >
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor: `${platform.color}08`,
                    borderColor: `${platform.color}33`,
                  },
                ]}
              >
                <Icon size={28} />
              </View>
              <View style={styles.body}>
                <Text style={styles.tagline}>{platform.tagline}</Text>
                <Text style={styles.cardTitle}>{platform.title}</Text>
                <Text style={styles.cardDescription}>{platform.description}</Text>
              </View>
              <View style={styles.arrow}>
                <ArrowUpRight size={16} color={colors.muted} weight="bold" />
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      padding: 24,
      paddingTop: 48,
    },
    nav: {
      marginTop: 32,
      gap: 12,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardPressed: {
      opacity: 0.92,
      transform: [{ translateY: -1 }],
    },
    icon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    body: {
      flex: 1,
    },
    tagline: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: colors.muted,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: -0.2,
      color: colors.foreground,
      marginTop: 2,
    },
    cardDescription: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 4,
      lineHeight: 18,
    },
    arrow: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
