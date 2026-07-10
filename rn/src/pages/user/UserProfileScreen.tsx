import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  ChatCircle,
  Heart,
  PencilSimple,
  UserPlus,
} from 'phosphor-react-native';
import type { AppScreenProps } from '@/app/navigation/types';
import { socialAPI } from '@/shared/api/social.api';
import type { PublicUserProfile } from '@/shared/api/social.types';
import { PublicProfileView } from '@/entities/user/ui/PublicProfileView';
import { Button } from '@/shared/ui/Button';
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { createCommonStyles } from '@/shared/theme/styles';
import type { ThemeColors } from '@/shared/theme/colors';

export function UserProfileScreen({
  route,
  navigation,
}: AppScreenProps<'UserProfile'>) {
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
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load profile',
      );
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
      await loadProfile();
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to send request',
      );
    } finally {
      setIsActing(false);
    }
  }

  async function acceptRequest() {
    if (!profile?.incomingRequestId) return;
    setIsActing(true);
    try {
      await socialAPI.acceptFriendRequest(profile.incomingRequestId);
      await loadProfile();
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to accept request',
      );
    } finally {
      setIsActing(false);
    }
  }

  async function rejectRequest() {
    if (!profile?.incomingRequestId) return;
    setIsActing(true);
    try {
      await socialAPI.rejectFriendRequest(profile.incomingRequestId);
      await loadProfile();
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to decline request',
      );
    } finally {
      setIsActing(false);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  if (!profile) {
    return (
      <View style={[commonStyles.screen, styles.center]}>
        <Text style={commonStyles.eyebrow}>Social</Text>
        <Text style={commonStyles.title}>User not found</Text>
        <Text style={commonStyles.subtitle}>
          This profile doesn&apos;t exist or was removed.
        </Text>
        <Button
          title="Back to friends"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.notFoundBtn}
        />
      </View>
    );
  }

  const actions =
    profile.relationship === 'self' ? (
      <Button
        title="Edit your profile"
        variant="outline"
        icon={<PencilSimple size={16} color={colors.foreground} weight="bold" />}
        onPress={() => navigation.navigate('Profile')}
      />
    ) : (
      <>
        {profile.relationship === 'none' ? (
          <Button
            title="Add friend"
            loading={isActing}
            icon={<UserPlus size={16} color={colors.primaryForeground} weight="bold" />}
            onPress={sendRequest}
          />
        ) : null}
        {profile.relationship === 'pending_incoming' ? (
          <>
            <Button
              title="Accept"
              loading={isActing}
              icon={<Heart size={16} color={colors.primaryForeground} weight="fill" />}
              onPress={acceptRequest}
            />
            <Button
              title="Decline"
              variant="outline"
              loading={isActing}
              onPress={rejectRequest}
            />
          </>
        ) : null}
        {profile.relationship === 'pending_outgoing' ? (
          <Button title="Request sent" variant="outline" disabled />
        ) : null}
        {profile.relationship === 'friend' ? (
          <Button
            title="Message"
            icon={<ChatCircle size={16} color={colors.primaryForeground} weight="fill" />}
            onPress={() =>
              navigation.navigate('MessagesThread', { userId: profile.userId })
            }
          />
        ) : null}
      </>
    );

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={commonStyles.eyebrow}>Social</Text>

      <View style={styles.profileWrap}>
        <PublicProfileView profile={profile} actions={actions} />
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      padding: 24,
      paddingTop: 48,
      paddingBottom: 40,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    profileWrap: {
      marginTop: 20,
    },
    center: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    notFoundBtn: {
      marginTop: 16,
      alignSelf: 'stretch',
      maxWidth: 280,
    },
  });
}
