import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Camera, Moon, PencilSimple, SignOut, Sun, X } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/entities/user/model/auth.store';
import { authAPI } from '@/shared/api/auth.api';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import { PublicProfileView } from '@/entities/user/ui/PublicProfileView';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { BirthDateField } from '@/shared/ui/BirthDateField';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import {
  isValidBirthDate,
  toDateInputValue,
} from '@/shared/lib/birth-date';
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_HINT,
} from '@/shared/lib/username';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { createCommonStyles } from '@/shared/theme/styles';
import type { ThemeColors } from '@/shared/theme/colors';

type Sex = 'male' | 'female' | 'other' | '';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: '', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const { colors, mode, isDark } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<Sex>('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function syncFromUser() {
    if (!user) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setUsername(user.username ?? '');
    setBirthDate(toDateInputValue(user.birthDate));
    setSex((user.sex as Sex) ?? '');
    setAvatarUrl(user.avatarUrl ?? '');
  }

  useEffect(() => {
    syncFromUser();
  }, [user]);

  const savedDisplayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ||
        user?.lastName ||
        user?.username ||
        user?.email?.split('@')[0] ||
        'Guest';

  const editDisplayName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName ||
        lastName ||
        username ||
        user?.email?.split('@')[0] ||
        'Guest';

  const themeModeLabel =
    mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';

  const isDirty = Boolean(
    user &&
      (firstName !== (user.firstName ?? '') ||
        lastName !== (user.lastName ?? '') ||
        username !== (user.username ?? '') ||
        birthDate !== toDateInputValue(user.birthDate) ||
        sex !== ((user.sex as Sex) ?? '')),
  );

  function startEditing() {
    syncFromUser();
    setIsEditing(true);
  }

  function cancelEditing() {
    syncFromUser();
    setIsEditing(false);
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    const mime = result.assets[0].mimeType ?? 'image/jpeg';
    const dataUrl = `data:${mime};base64,${result.assets[0].base64}`;

    setIsUploadingAvatar(true);
    try {
      const updated = await authAPI.updateProfile({ avatarUrl: dataUrl });
      setUser(updated);
      setAvatarUrl(updated.avatarUrl ?? dataUrl);
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to upload photo',
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!avatarUrl) return;
    setIsUploadingAvatar(true);
    try {
      const updated = await authAPI.updateProfile({ avatarUrl: '' });
      setUser(updated);
      setAvatarUrl('');
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to remove photo',
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function saveProfile() {
    if (!user || !isDirty) {
      setIsEditing(false);
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername && !isValidUsername(normalizedUsername)) {
      Alert.alert('Error', USERNAME_HINT);
      return;
    }

    if (birthDate && !isValidBirthDate(birthDate)) {
      Alert.alert('Error', 'Enter a valid birth date (YYYY-MM-DD)');
      return;
    }

    setIsSaving(true);
    try {
      // Send empty strings to clear fields — backend treats "" as null.
      // (`|| undefined` would omit them from JSON and leave old values).
      const updated = await authAPI.updateProfile({
        username: normalizedUsername,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        sex,
      });
      setUser(updated);
      setFirstName(updated.firstName ?? '');
      setLastName(updated.lastName ?? '');
      setUsername(updated.username ?? '');
      setBirthDate(toDateInputValue(updated.birthDate));
      setSex((updated.sex as Sex) ?? '');
      setAvatarUrl(updated.avatarUrl ?? '');
      setIsEditing(false);
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update profile',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (!user) return null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={commonStyles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isEditing ? (
          <>
            <View style={styles.editHeader}>
              <View style={styles.editHeaderText}>
                <Text style={commonStyles.eyebrow}>Account</Text>
                <Text style={commonStyles.title}>Edit profile</Text>
              </View>
              <Pressable
                onPress={cancelEditing}
                disabled={isSaving}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeEditBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel="Cancel editing"
              >
                <X size={18} color={colors.muted} weight="bold" />
              </Pressable>
            </View>

            <View style={styles.editSheet}>
              <View style={styles.editHero}>
                <View
                  style={[styles.editOrb, styles.editOrbA, { backgroundColor: `${colors.primary}22` }]}
                />
                <View
                  style={[styles.editOrb, styles.editOrbB, { backgroundColor: `${colors.primary}12` }]}
                />
              </View>

              <View style={styles.editAvatarStage}>
                <Pressable
                  onPress={pickAvatar}
                  disabled={isUploadingAvatar || isSaving}
                  style={({ pressed }) => [
                    styles.avatarTrigger,
                    pressed && styles.pressed,
                  ]}
                  accessibilityLabel="Upload profile photo"
                >
                  <View style={[styles.avatarHalo, { borderColor: `${colors.primary}40` }]} />
                  <View style={styles.avatarFrame}>
                    <UserAvatar
                      user={{ ...user, displayName: editDisplayName, avatarUrl }}
                      size="xl"
                    />
                    {isUploadingAvatar ? (
                      <View style={styles.avatarBusy}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.cameraBadge}>
                    <Camera size={14} color="#fff" weight="bold" />
                  </View>
                </Pressable>
              </View>

              <View style={styles.editIdentity}>
                <Text style={styles.editName} numberOfLines={1}>
                  {editDisplayName}
                </Text>
                {username ? (
                  <Text style={styles.editUsername} numberOfLines={1}>
                    @{username}
                  </Text>
                ) : null}
                {avatarUrl ? (
                  <Pressable
                    onPress={removeAvatar}
                    disabled={isUploadingAvatar || isSaving}
                    hitSlop={8}
                    style={styles.removePhotoBtn}
                  >
                    <Text style={styles.removePhotoText}>Remove photo</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.editSections}>
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Name</Text>
                  <View style={styles.row2}>
                    <Field label="First" styles={styles} style={styles.half}>
                      <Input
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Alex"
                        editable={!isSaving}
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Last" styles={styles} style={styles.half}>
                      <Input
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Johnson"
                        editable={!isSaving}
                        style={styles.input}
                      />
                    </Field>
                  </View>
                  <Field label="Username" styles={styles}>
                    <Input
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="yourname"
                      editable={!isSaving}
                      style={styles.input}
                    />
                    <Text style={styles.hint}>
                      3–30 chars · letters, numbers, _
                    </Text>
                  </Field>
                </View>

                <View style={styles.sectionRule} />

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Details</Text>
                  <Field label="Birth date" styles={styles}>
                    <BirthDateField
                      value={birthDate}
                      onChange={setBirthDate}
                      disabled={isSaving}
                    />
                  </Field>
                  <Field label="Sex" styles={styles}>
                    <View style={styles.segment}>
                      {SEX_OPTIONS.map((option) => {
                        const active = sex === option.value;
                        return (
                          <Pressable
                            key={option.label}
                            onPress={() => setSex(option.value)}
                            disabled={isSaving}
                            style={[
                              styles.segmentBtn,
                              active && styles.segmentBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.segmentText,
                                active && styles.segmentTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {option.label === 'Not specified' ? '—' : option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Field>
                </View>

                <View style={styles.sectionRule} />

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Account</Text>
                  <View style={styles.emailRow}>
                    <View style={styles.emailText}>
                      <Text style={styles.emailLabel}>Email</Text>
                      <Text style={styles.emailValue} numberOfLines={1}>
                        {user.email}
                      </Text>
                    </View>
                    <View style={styles.emailLock}>
                      <Text style={styles.emailLockText}>Locked</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.editFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  disabled={isSaving}
                  onPress={cancelEditing}
                  style={styles.footerBtn}
                />
                <Button
                  title={isSaving ? 'Saving…' : isDirty ? 'Save changes' : 'Saved'}
                  loading={isSaving}
                  disabled={!isDirty || isUploadingAvatar}
                  onPress={saveProfile}
                  style={styles.footerBtn}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={commonStyles.eyebrow}>Account</Text>
            <Text style={commonStyles.title}>Profile</Text>

            <View style={styles.previewWrap}>
              <PublicProfileView
                profile={{
                  userId: user.userId,
                  displayName: savedDisplayName,
                  username: user.username,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  avatarUrl: user.avatarUrl,
                  birthDate: user.birthDate,
                  sex: user.sex,
                  createdAt: user.createdAt,
                  relationship: 'self',
                }}
                caption={user.email}
                actions={
                  <Button
                    title="Edit profile"
                    variant="outline"
                    icon={
                      <PencilSimple
                        size={16}
                        color={colors.foreground}
                        weight="bold"
                      />
                    }
                    onPress={startEditing}
                  />
                }
              />
            </View>

            <View style={styles.settingsBlock}>
              <Text style={styles.settingsLabel}>Settings</Text>
              <View style={styles.settingsCard}>
                <View style={styles.settingsRow}>
                  <View style={styles.settingsLeft}>
                    <View style={[styles.settingsIcon, styles.settingsIconAccent]}>
                      {isDark ? (
                        <Sun size={16} color={colors.primary} weight="duotone" />
                      ) : (
                        <Moon size={16} color={colors.primary} weight="duotone" />
                      )}
                    </View>
                    <View style={styles.settingsCopy}>
                      <Text style={styles.settingsTitle}>Theme</Text>
                      <Text style={styles.settingsDesc}>{themeModeLabel} mode</Text>
                    </View>
                  </View>
                  <ThemeToggle size={20} />
                </View>

                <View style={styles.settingsDivider} />

                <View style={styles.settingsRow}>
                  <View style={styles.settingsLeft}>
                    <View style={styles.settingsIcon}>
                      <SignOut size={16} color={colors.muted} weight="bold" />
                    </View>
                    <View style={styles.settingsCopy}>
                      <Text style={styles.settingsTitle}>Log out</Text>
                      <Text style={styles.settingsDesc}>Sign out of your account</Text>
                    </View>
                  </View>
                  <Button
                    title={isLoggingOut ? '…' : 'Log out'}
                    variant="outline"
                    disabled={isLoggingOut}
                    onPress={handleLogout}
                    style={styles.logoutBtn}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  children,
  styles,
  style,
}: {
  label: string;
  children: ReactNode;
  styles: ReturnType<typeof createStyles>;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 24,
      paddingTop: 48,
      paddingBottom: 40,
      gap: 0,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    pressed: {
      opacity: 0.85,
    },
    previewWrap: {
      marginTop: 24,
    },

    // Edit mode
    editHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 20,
    },
    editHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    closeEditBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    editSheet: {
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
    editHero: {
      height: 108,
      overflow: 'hidden',
      backgroundColor: colors.mutedBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    editOrb: {
      position: 'absolute',
      borderRadius: 999,
    },
    editOrbA: {
      width: 180,
      height: 180,
      top: -60,
      left: -30,
    },
    editOrbB: {
      width: 140,
      height: 140,
      top: -40,
      right: -40,
    },
    editAvatarStage: {
      alignItems: 'center',
      marginTop: -52,
      zIndex: 20,
      elevation: 20,
    },
    avatarTrigger: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: colors.card,
      overflow: 'hidden',
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
    avatarBusy: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
    },
    cameraBadge: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.card,
      zIndex: 22,
      elevation: 22,
    },
    editIdentity: {
      alignItems: 'center',
      paddingTop: 14,
      paddingHorizontal: 20,
      gap: 2,
    },
    editName: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.4,
      color: colors.foreground,
    },
    editUsername: {
      fontSize: 14,
      color: colors.muted,
    },
    removePhotoBtn: {
      marginTop: 8,
      paddingVertical: 4,
    },
    removePhotoText: {
      fontSize: 13,
      color: colors.muted,
      textDecorationLine: 'underline',
    },
    editSections: {
      paddingTop: 8,
      paddingBottom: 4,
    },
    section: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      gap: 14,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    sectionRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: 18,
    },
    field: {
      gap: 7,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.muted,
    },
    input: {
      borderRadius: 14,
      backgroundColor: colors.background,
      borderColor: colors.border,
      height: 46,
    },
    hint: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.muted,
    },
    row2: {
      flexDirection: 'row',
      gap: 10,
    },
    half: {
      flex: 1,
      minWidth: 0,
    },
    segment: {
      flexDirection: 'row',
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.mutedBg,
      padding: 3,
      gap: 2,
    },
    segmentBtn: {
      flex: 1,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    segmentBtnActive: {
      backgroundColor: colors.card,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
          }
        : { elevation: 2 }),
    },
    segmentText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.muted,
    },
    segmentTextActive: {
      color: colors.foreground,
      fontWeight: '600',
    },
    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    emailText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    emailLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    emailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    emailLock: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.mutedBg,
    },
    emailLockText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
    },
    editFooter: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      padding: 16,
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.mutedBg,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    footerBtn: {
      flex: 1,
      borderRadius: 14,
    },

    // Settings
    settingsBlock: {
      marginTop: 24,
      gap: 10,
    },
    settingsLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: colors.muted,
      paddingHorizontal: 4,
    },
    settingsCard: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    settingsDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 66,
    },
    settingsLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minWidth: 0,
    },
    settingsIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.mutedBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsIconAccent: {
      backgroundColor: `${colors.primary}18`,
    },
    settingsCopy: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    settingsTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    settingsDesc: {
      fontSize: 12,
      color: colors.muted,
    },
    logoutBtn: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
  });
}
