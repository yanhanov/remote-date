import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import type { AppScreenProps } from '@/app/navigation/types';
import { socialAPI } from '@/shared/api/social.api';
import type { PublicUserProfile, RelationshipStatus } from '@/shared/api/social.types';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { computeAge, formatBirthDate } from '@/shared/lib/birth-date';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { createCommonStyles } from '@/shared/theme/styles';
import type { ThemeColors } from '@/shared/theme/colors';

export function UserProfileScreen({ route, navigation }: AppScreenProps<'UserProfile'>) {
  const { colors } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = route.params.id;
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  async function loadProfile() {
    setIsLoading(true);
    try {
      setProfile(await socialAPI.getUserProfile(userId));
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load profile');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, [userId]);

  async function sendRequest() {
    if (!profile) return;
    setIsActing(true);
    try {
      await socialAPI.sendFriendRequest(profile.userId);
      Alert.alert('Success', 'Friend request sent');
      await loadProfile();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setIsActing(false);
    }
  }

  async function acceptRequest() {
    if (!profile?.incomingRequestId) return;
    setIsActing(true);
    try {
      await socialAPI.acceptFriendRequest(profile.incomingRequestId);
      Alert.alert('Success', 'Friend request accepted');
      await loadProfile();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setIsActing(false);
    }
  }

  async function rejectRequest() {
    if (!profile?.incomingRequestId) return;
    setIsActing(true);
    try {
      await socialAPI.rejectFriendRequest(profile.incomingRequestId);
      Alert.alert('Success', 'Request declined');
      await loadProfile();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to decline request');
    } finally {
      setIsActing(false);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  if (!profile) {
    return (
      <View style={[commonStyles.screen, styles.center]}>
        <Text style={commonStyles.title}>User not found</Text>
        <Button title="Back to friends" variant="outline" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const age = computeAge(profile.birthDate);
  const birthDateFormatted = formatBirthDate(profile.birthDate);
  const relationshipLabel = getRelationshipLabel(profile.relationship);

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={styles.content}>
      <Text style={commonStyles.eyebrow}>Social</Text>
      <Text style={commonStyles.title}>{profile.displayName}</Text>
      {profile.username ? (
        <Text style={commonStyles.subtitle}>@{profile.username}</Text>
      ) : null}

      <View style={styles.identityCard}>
        <UserAvatar user={profile} size="xl" />
        {relationshipLabel ? (
          <View style={[styles.badge, badgeStyle(profile.relationship, styles)]}>
            <Text style={styles.badgeText}>{relationshipLabel}</Text>
          </View>
        ) : null}

        {profile.relationship !== 'self' ? (
          <View style={styles.actions}>
            {profile.relationship === 'none' ? (
              <Button title="Add friend" loading={isActing} onPress={sendRequest} />
            ) : null}
            {profile.relationship === 'pending_incoming' ? (
              <>
                <Button title="Accept" loading={isActing} onPress={acceptRequest} />
                <Button title="Decline" variant="outline" loading={isActing} onPress={rejectRequest} />
              </>
            ) : null}
            {profile.relationship === 'pending_outgoing' ? (
              <Button title="Request sent" variant="outline" disabled />
            ) : null}
            {profile.relationship === 'friend' ? (
              <Button
                title="Message"
                onPress={() => navigation.navigate('MessagesThread', { userId: profile.userId })}
              />
            ) : null}
          </View>
        ) : (
          <Button title="Edit your profile" variant="outline" onPress={() => navigation.navigate('Profile')} />
        )}
      </View>

      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>About</Text>
        {age != null ? <InfoRow label="Age" value={`${age} years old`} styles={styles} /> : null}
        {profile.sex ? <InfoRow label="Sex" value={profile.sex} styles={styles} /> : null}
        {birthDateFormatted ? <InfoRow label="Birthday" value={birthDateFormatted} styles={styles} /> : null}
        {profile.createdAt ? (
          <InfoRow
            label="Member since"
            value={new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
              new Date(profile.createdAt),
            )}
            styles={styles}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

type ProfileStyles = ReturnType<typeof createStyles>;

function InfoRow({ label, value, styles }: { label: string; value: string; styles: ProfileStyles }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
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

function badgeStyle(relationship: RelationshipStatus, styles: ProfileStyles) {
  if (relationship === 'friend') return styles.badgeFriend;
  if (relationship === 'pending_incoming') return styles.badgeIncoming;
  if (relationship === 'pending_outgoing') return styles.badgeOutgoing;
  return null;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    center: {
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    identityCard: {
      alignItems: 'center',
      marginTop: 24,
      padding: 20,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeFriend: {
      backgroundColor: `${colors.primary}15`,
      borderColor: `${colors.primary}40`,
    },
    badgeIncoming: {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b40',
    },
    badgeOutgoing: {
      backgroundColor: colors.mutedBg,
      borderColor: colors.border,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.foreground,
    },
    actions: {
      width: '100%',
      gap: 8,
    },
    aboutCard: {
      marginTop: 20,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    aboutTitle: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: colors.muted,
      marginBottom: 4,
    },
    infoRow: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
      marginTop: 2,
    },
  });
}
