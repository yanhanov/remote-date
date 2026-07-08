import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { User, Camera, SignOut } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/entities/user/model/auth.store";
import { authAPI } from "@/shared/api/auth.api";
import { UserAvatar } from "@/entities/user/ui/UserAvatar";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { toDateInputValue } from "@/shared/lib/birth-date";
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_HINT,
} from "@/shared/lib/username";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { createCommonStyles } from "@/shared/theme/styles";
import type { ThemeColors } from "@/shared/theme/colors";

type Sex = "male" | "female" | "other" | "";

export function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const { colors, mode } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Sex>("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setUsername(user.username ?? "");
    setBirthDate(toDateInputValue(user.birthDate));
    setSex((user.sex as Sex) ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
  }, [user]);

  const displayName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName ||
        lastName ||
        username ||
        user?.email?.split("@")[0] ||
        "Guest";

  const themeModeLabel =
    mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System";

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    const mime = result.assets[0].mimeType ?? "image/jpeg";
    const dataUrl = `data:${mime};base64,${result.assets[0].base64}`;

    setIsUploadingAvatar(true);
    try {
      const updated = await authAPI.updateProfile({ avatarUrl: dataUrl });
      setUser(updated);
      setAvatarUrl(updated.avatarUrl ?? dataUrl);
      Alert.alert("Success", "Photo updated");
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to upload photo",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!avatarUrl) return;
    setIsUploadingAvatar(true);
    try {
      const updated = await authAPI.updateProfile({ avatarUrl: "" });
      setUser(updated);
      setAvatarUrl("");
      Alert.alert("Success", "Photo removed");
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to remove photo",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function saveProfile() {
    if (!user) return;

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername && !isValidUsername(normalizedUsername)) {
      Alert.alert("Error", USERNAME_HINT);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await authAPI.updateProfile({
        username: normalizedUsername || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        birthDate: birthDate || undefined,
        sex: sex || undefined,
      });
      setUser(updated);
      Alert.alert("Success", "Profile saved");
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
  }

  if (!user) return null;

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <User size={28} color={colors.primary} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={commonStyles.eyebrow}>Account</Text>
          <Text style={commonStyles.title}>Profile</Text>
          <Text style={commonStyles.subtitle}>
            Photo, personal details and app settings.
          </Text>
        </View>
      </View>

      <View style={styles.avatarSection}>
        <Pressable onPress={pickAvatar} style={styles.avatarButton}>
          <UserAvatar user={{ ...user, displayName, avatarUrl }} size="lg" />
          <View style={styles.cameraBadge}>
            <Camera size={14} color="#fff" weight="bold" />
          </View>
        </Pressable>
        <View style={styles.avatarActions}>
          <Button
            title={isUploadingAvatar ? "Uploading..." : "Change photo"}
            variant="outline"
            loading={isUploadingAvatar}
            onPress={pickAvatar}
          />
          {avatarUrl ? (
            <Button
              title="Remove photo"
              variant="ghost"
              onPress={removeAvatar}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.themeSection}>
        <Text style={styles.sectionHeading}>Appearance</Text>
        <View style={styles.themeRow}>
          <View>
            <Text style={styles.label}>Theme</Text>
            <Text style={styles.themeLabel}>{themeModeLabel}</Text>
          </View>
          <ThemeToggle size={22} />
        </View>
      </View>

      <View style={styles.form}>
        <Field
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          styles={styles}
        />
        <Field
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          styles={styles}
        />
        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          styles={styles}
        />
        <Field
          label="Birth date (YYYY-MM-DD)"
          value={birthDate}
          onChangeText={setBirthDate}
          styles={styles}
        />
        <Text style={styles.label}>Sex</Text>
        <View style={styles.sexRow}>
          {(["male", "female", "other"] as const).map((option) => (
            <Pressable
              key={option}
              style={[styles.sexBtn, sex === option && styles.sexBtnActive]}
              onPress={() => setSex(option)}
            >
              <Text
                style={[styles.sexText, sex === option && styles.sexTextActive]}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Email"
          value={user.email}
          editable={false}
          styles={styles}
        />
      </View>

      <Button
        title={isSaving ? "Saving..." : "Save profile"}
        loading={isSaving}
        onPress={saveProfile}
      />
      <Button
        title="Log out"
        variant="destructive"
        icon={
          <SignOut size={16} color={colors.primaryForeground} weight="bold" />
        }
        onPress={handleLogout}
        style={styles.logout}
      />
    </ScrollView>
  );
}

type FieldStyles = ReturnType<typeof createStyles>;

function Field({
  label,
  value,
  onChangeText,
  editable = true,
  autoCapitalize,
  styles,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences";
  styles: FieldStyles;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        autoCapitalize={autoCapitalize}
        style={!editable ? styles.disabledInput : undefined}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      padding: 24,
      paddingTop: 48,
      paddingBottom: 40,
    },
    brand: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
    },
    brandIcon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: `${colors.primary}1a`,
      borderWidth: 1,
      borderColor: `${colors.primary}33`,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarSection: {
      alignItems: "center",
      marginTop: 24,
      marginBottom: 24,
      gap: 12,
    },
    avatarButton: {
      position: "relative",
    },
    cameraBadge: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.card,
    },
    avatarActions: {
      width: "100%",
      gap: 8,
    },
    themeSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 20,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.muted,
      marginBottom: 12,
    },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    themeLabel: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    form: {
      gap: 4,
      marginBottom: 20,
    },
    field: {
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.foreground,
      marginBottom: 6,
    },
    disabledInput: {
      opacity: 0.6,
    },
    sexRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    sexBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    sexBtnActive: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    sexText: {
      fontSize: 13,
      color: colors.muted,
    },
    sexTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    logout: {
      marginTop: 12,
    },
  });
}
