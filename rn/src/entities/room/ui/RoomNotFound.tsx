import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "@/shared/ui/Button";
import { useTheme } from "@/shared/theme/ThemeProvider";
import type { ThemeColors } from "@/shared/theme/colors";

interface RoomNotFoundProps {
  roomId: string;
  roomType: "youtube" | "soundcloud";
  error: string;
  onGoBack: () => void;
}

export function RoomNotFound({
  roomId,
  roomType,
  error,
  onGoBack,
}: RoomNotFoundProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {roomType === "youtube" ? "YouTube room" : "SoundCloud room"} not found
      </Text>
      <Text style={styles.subtitle}>Room {roomId.slice(0, 8)}</Text>
      <Text style={styles.error}>{error}</Text>
      <Button title="Go back" variant="outline" onPress={onGoBack} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    error: {
      fontSize: 14,
      color: colors.destructive,
      textAlign: "center",
      marginBottom: 8,
    },
  });
}
