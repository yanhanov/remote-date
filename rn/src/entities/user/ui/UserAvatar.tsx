import { useMemo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { getUserInitials } from "@/shared/api/social.api";
import type { PublicUserSummary } from "@/shared/api/social.types";
import { useTheme } from "@/shared/theme/ThemeProvider";
import type { ThemeColors } from "@/shared/theme/colors";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

const sizeMap: Record<Exclude<AvatarSize, number>, number> = {
  xs: 24,
  sm: 36,
  md: 44,
  lg: 96,
  xl: 128,
};

interface UserAvatarProps {
  user: Pick<
    PublicUserSummary,
    "firstName" | "lastName" | "userId" | "avatarUrl"
  > & {
    displayName?: string;
    email?: string;
  };
  size?: AvatarSize;
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const dimension = typeof size === "number" ? size : sizeMap[size];
  const fontSize =
    dimension <= 24 ? 10 : dimension < 50 ? 13 : dimension < 100 ? 20 : 28;

  if (user.avatarUrl) {
    return (
      <Image
        source={{ uri: user.avatarUrl }}
        style={[
          styles.image,
          { width: dimension, height: dimension, borderRadius: dimension / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>
        {getUserInitials(user)}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    image: {
      backgroundColor: colors.mutedBg,
    },
    fallback: {
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    initials: {
      color: colors.primary,
      fontWeight: "600",
    },
  });
}
