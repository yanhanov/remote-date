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
                <X size={20} color={colors.muted} weight="bold" />
              </Pressable>
            </View>

            <View style={styles.editIdentity}>
              <Pressable
                onPress={pickAvatar}
                disabled={isUploadingAvatar || isSaving}
                style={({ pressed }) => [
                  styles.avatarTrigger,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel="Upload profile photo"
              >
                <View style={styles.avatarRing}>
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
              {avatarUrl ? (
                <Pressable
                  onPress={removeAvatar}
                  disabled={isUploadingAvatar || isSaving}
                  hitSlop={8}
                >
                  <Text style={styles.removePhotoText}>Remove photo</Text>
                </Pressable>
              ) : (
                <Text style={styles.avatarHint}>Tap photo to change</Text>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>Personal information</Text>
              </View>

              <View style={styles.cardBody}>
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
                    Letters, numbers, underscores. 3–30 characters.
                  </Text>
                </Field>

                <View style={styles.row2}>
                  <Field label="First name" styles={styles} style={styles.half}>
                    <Input
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Alex"
                      editable={!isSaving}
                      style={styles.input}
                    />
                  </Field>
                  <Field label="Last name" styles={styles} style={styles.half}>
                    <Input
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Johnson"
                      editable={!isSaving}
                      style={styles.input}
                    />
                  </Field>
                </View>

                <Field label="Birth date" styles={styles}>
                  <BirthDateField
                    value={birthDate}
                    onChange={setBirthDate}
                    disabled={isSaving}
                  />
                </Field>

                <Field label="Sex" styles={styles}>
                  <View style={styles.chips}>
                    {SEX_OPTIONS.map((option) => {
                      const active = sex === option.value;
                      return (
                        <Pressable
                          key={option.label}
                          onPress={() => setSex(option.value)}
                          disabled={isSaving}
                          style={({ pressed }) => [
                            styles.chip,
                            active && styles.chipActive,
                            pressed && !active && styles.chipPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>

                <Field label="Email" styles={styles}>
                  <Input
                    value={user.email}
                    editable={false}
                    style={[styles.input, styles.disabledInput]}
                  />
                </Field>
              </View>

              <View style={styles.cardFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  disabled={isSaving}
                  onPress={cancelEditing}
                  style={styles.footerBtn}
                />
                <Button
                  title={isSaving ? 'Saving…' : 'Save'}
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
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.mutedBg,
    },
    editIdentity: {
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
    },
    avatarTrigger: {
      position: 'relative',
    },
    avatarRing: {
      borderRadius: 64,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    avatarBusy: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraBadge: {
      position: 'absolute',
      right: 4,
      bottom: 4,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    removePhotoText: {
      fontSize: 13,
      color: colors.muted,
      textDecorationLine: 'underline',
    },
    avatarHint: {
      fontSize: 13,
      color: colors.muted,
    },
    card: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    cardHeader: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 3,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    cardDescription: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.muted,
    },
    cardBody: {
      padding: 18,
      gap: 16,
    },
    cardFooter: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      padding: 14,
      paddingHorizontal: 18,
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.mutedBg,
    },
    footerBtn: {
      flex: 1,
      borderRadius: 12,
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
      borderRadius: 12,
      backgroundColor: colors.background,
      borderColor: colors.border,
      height: 44,
    },
    disabledInput: {
      opacity: 0.65,
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
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipActive: {
      backgroundColor: `${colors.primary}18`,
      borderColor: colors.primary,
    },
    chipPressed: {
      backgroundColor: colors.mutedBg,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.muted,
    },
    chipTextActive: {
      color: colors.primary,
      fontWeight: '600',
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
