import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import {
  CalendarBlank,
  GenderIntersex,
  Heart,
  User as UserIcon,
  UsersThree,
  type Icon,
} from 'phosphor-react-native';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import type { PublicUserProfile, RelationshipStatus } from '@/shared/api/social.types';
import { computeAge, formatBirthDate } from '@/shared/lib/birth-date';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

export type PublicProfileData = Pick<
  PublicUserProfile,
  | 'userId'
  | 'displayName'
  | 'username'
  | 'firstName'
  | 'lastName'
  | 'avatarUrl'
  | 'birthDate'
  | 'sex'
  | 'createdAt'
  | 'friendsSince'
> & {
  relationship?: RelationshipStatus;
  email?: string;
};

interface PublicProfileViewProps {
  profile: PublicProfileData;
  actions?: ReactNode;
  caption?: string;
}

type DetailItem = { icon: Icon; label: string; value: string };

export function PublicProfileView({
  profile,
  actions,
  caption,
}: PublicProfileViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const age = computeAge(profile.birthDate);
  const birthday = formatBirthDate(profile.birthDate);
  const sexLabel = formatSex(profile.sex);
  const memberSince = profile.createdAt
    ? new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
      }).format(new Date(profile.createdAt))
    : null;
  const friendsSince = profile.friendsSince
    ? new Intl.DateTimeFormat(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(profile.friendsSince))
    : null;

  const relationshipLabel = profile.relationship
    ? getRelationshipLabel(profile.relationship)
    : null;

  const metrics: { label: string; value: string }[] = [];
  if (age != null) metrics.push({ label: 'Age', value: String(age) });
  if (sexLabel) metrics.push({ label: 'Sex', value: sexLabel });
  if (memberSince) {
    metrics.push({
      label: 'Joined',
      value: memberSince.match(/\d{4}/)?.[0] ?? memberSince,
    });
  }

  const details: DetailItem[] = [];
  if (birthday) {
    details.push({ icon: CalendarBlank, label: 'Birthday', value: birthday });
  }
  if (memberSince) {
    details.push({ icon: UsersThree, label: 'Member since', value: memberSince });
  }
  if (age != null) {
    details.push({
      icon: UserIcon,
      label: 'Age',
      value: `${age} years old`,
    });
  }
  if (sexLabel) {
    details.push({ icon: GenderIntersex, label: 'Sex', value: sexLabel });
  }

  // Prefer metrics strip for age/sex/year; keep birthday + full join date in details only
  const detailRows = details.filter(
    (d) => d.label === 'Birthday' || d.label === 'Member since',
  );

  return (
    <View style={styles.root}>
      <View style={styles.sheet}>
        {/* Hero wash */}
        <View style={styles.heroBand}>
          <View style={[styles.orb, styles.orbA, { backgroundColor: `${colors.primary}22` }]} />
          <View style={[styles.orb, styles.orbB, { backgroundColor: `${colors.primary}12` }]} />
          <View style={[styles.orb, styles.orbC, { backgroundColor: colors.accent }]} />

          {relationshipLabel ? (
            <View style={styles.topBadges}>
              <View
                style={[styles.badge, badgeStyle(profile.relationship!, colors)]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    badgeTextStyle(profile.relationship!, colors),
                  ]}
                >
                  {relationshipLabel}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Avatar sits above hero + identity */}
        <View style={styles.avatarStage} pointerEvents="none">
          <View style={[styles.avatarHalo, { borderColor: `${colors.primary}40` }]} />
          <View style={[styles.avatarFrame, { backgroundColor: colors.card }]}>
            <UserAvatar user={profile} size="xl" />
          </View>
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={2}>
            {profile.displayName}
          </Text>
          {profile.username ? (
            <Text style={styles.username} numberOfLines={1}>
              @{profile.username}
            </Text>
          ) : null}
          {caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>

        {/* Metrics */}
        {metrics.length > 0 ? (
          <View style={styles.metrics}>
            {metrics.map((m, i) => (
              <View key={m.label} style={styles.metricCell}>
                {i > 0 ? <View style={styles.metricDivider} /> : null}
                <View style={styles.metricInner}>
                  <Text style={styles.metricValue} numberOfLines={1}>
                    {m.value}
                  </Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Details */}
        {detailRows.length > 0 ? (
          <View style={styles.details}>
            {detailRows.map((item, index) => {
              const ItemIcon = item.icon;
              return (
                <View key={item.label}>
                  {index > 0 ? <View style={styles.detailRule} /> : null}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <ItemIcon size={18} color={colors.primary} weight="duotone" />
                    </View>
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>{item.label}</Text>
                      <Text style={styles.detailValue}>{item.value}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : metrics.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No public details yet</Text>
            <Text style={styles.emptyText}>
              Birthday and other info will appear here when added.
            </Text>
          </View>
        ) : null}

        {friendsSince && profile.relationship === 'friend' ? (
          <View style={styles.friendsRow}>
            <View style={styles.friendsIcon}>
              <Heart size={16} color={colors.primary} weight="fill" />
            </View>
            <View style={styles.friendsText}>
              <Text style={styles.friendsLabel}>Friends since</Text>
              <Text style={styles.friendsValue}>{friendsSince}</Text>
            </View>
          </View>
        ) : null}

        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

function formatSex(sex?: string | null) {
  if (!sex) return null;
  return { male: 'Male', female: 'Female', other: 'Other' }[sex] ?? null;
}

function getRelationshipLabel(relationship: RelationshipStatus): string | null {
  const map: Record<RelationshipStatus, string | null> = {
    self: null,
    none: null,
    friend: 'Friends',
    pending_outgoing: 'Request sent',
    pending_incoming: 'Wants to be friends',
  };
  return map[relationship];
}

function badgeStyle(relationship: RelationshipStatus, colors: ThemeColors) {
  if (relationship === 'friend') {
    return {
      backgroundColor: `${colors.primary}18`,
      borderColor: `${colors.primary}40`,
    };
  }
  if (relationship === 'pending_incoming') {
    return {
      backgroundColor: `${colors.warning}22`,
      borderColor: `${colors.warning}55`,
    };
  }
  return {
    backgroundColor: colors.mutedBg,
    borderColor: colors.border,
  };
}

function badgeTextStyle(relationship: RelationshipStatus, colors: ThemeColors) {
  if (relationship === 'friend') return { color: colors.primary };
  if (relationship === 'pending_incoming') return { color: colors.warning };
  return { color: colors.muted };
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      width: '100%',
    },
    sheet: {
      borderRadius: 28,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'visible',
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
          }
        : { elevation: 3 }),
    },
    heroBand: {
      height: 132,
      alignItems: 'center',
      justifyContent: 'flex-end',
      overflow: 'hidden',
      backgroundColor: colors.mutedBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    orb: {
      position: 'absolute',
      borderRadius: 999,
    },
    orbA: {
      width: 200,
      height: 200,
      top: -70,
      left: -40,
    },
    orbB: {
      width: 160,
      height: 160,
      top: -30,
      right: -50,
    },
    orbC: {
      width: 120,
      height: 120,
      bottom: -20,
      alignSelf: 'center',
      opacity: 0.55,
    },
    topBadges: {
      position: 'absolute',
      top: 14,
      left: 14,
      right: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      zIndex: 2,
    },
    badge: {
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: `${colors.card}E6`,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    avatarStage: {
      position: 'absolute',
      top: 56,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      elevation: 20,
    },
    avatarHalo: {
      position: 'absolute',
      width: 148,
      height: 148,
      borderRadius: 74,
      borderWidth: 1.5,
    },
    avatarFrame: {
      padding: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 21,
      elevation: 21,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 14,
          }
        : null),
    },
    identity: {
      alignItems: 'center',
      paddingTop: 76,
      paddingHorizontal: 24,
      gap: 4,
      zIndex: 1,
    },
    name: {
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.6,
      color: colors.foreground,
      textAlign: 'center',
    },
    username: {
      fontSize: 15,
      color: colors.muted,
      letterSpacing: -0.1,
    },
    caption: {
      marginTop: 2,
      fontSize: 13,
      color: colors.muted,
      opacity: 0.85,
    },
    metrics: {
      marginTop: 20,
      marginHorizontal: 16,
      flexDirection: 'row',
      borderRadius: 18,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    metricCell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      minWidth: 0,
    },
    metricDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    metricInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 8,
      gap: 2,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.4,
      color: colors.foreground,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    details: {
      marginTop: 8,
      paddingHorizontal: 8,
      paddingBottom: 4,
    },
    detailRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 66,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    detailIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${colors.primary}12`,
      borderWidth: 1,
      borderColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    detailValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.2,
    },
    empty: {
      marginTop: 16,
      marginHorizontal: 16,
      marginBottom: 4,
      paddingVertical: 22,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    emptyText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
      textAlign: 'center',
      maxWidth: 260,
    },
    friendsRow: {
      marginTop: 8,
      marginHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: `${colors.primary}10`,
      borderWidth: 1,
      borderColor: `${colors.primary}28`,
    },
    friendsIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: `${colors.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    friendsText: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    friendsLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    friendsValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    actions: {
      padding: 16,
      paddingTop: 12,
      gap: 8,
    },
  });
}
