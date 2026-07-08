import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Plus, LinkSimple } from "phosphor-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { roomAPI } from "@/shared/api/room.api";
import type { VideoRoom } from "@/shared/api/room.types";
import type { AppStackParamList } from "@/app/navigation/types";
import { YouTubeIcon, SoundCloudIcon } from "@/shared/ui/icons/PlatformIcons";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { createCommonStyles } from "@/shared/theme/styles";
import type { ThemeColors } from "@/shared/theme/colors";

interface PlatformConfig {
  title: string;
  tagline: string;
  description: string;
  createDescription: string;
  roomType: "youtube" | "soundcloud";
  roomRoute: "Room" | "SoundRoom";
  accent: string;
  Icon: typeof YouTubeIcon;
}

interface PlatformHubProps {
  platform: "youtube" | "soundcloud";
  navigation: NativeStackNavigationProp<
    AppStackParamList,
    "YoutubeHub" | "SoundcloudHub"
  >;
}

export function PlatformHub({ platform, navigation }: PlatformHubProps) {
  const { colors } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const configs = useMemo(
    (): Record<"youtube" | "soundcloud", PlatformConfig> => ({
      youtube: {
        title: "YouTube",
        tagline: "Video rooms",
        description: "Create or join a synced watch party.",
        createDescription: "Start a new room and pick a video together.",
        roomType: "youtube",
        roomRoute: "Room",
        accent: colors.youtube,
        Icon: YouTubeIcon,
      },
      soundcloud: {
        title: "SoundCloud",
        tagline: "Music rooms",
        description: "Create or join a listening room.",
        createDescription: "Start a new room and queue tracks together.",
        roomType: "soundcloud",
        roomRoute: "SoundRoom",
        accent: colors.soundcloud,
        Icon: SoundCloudIcon,
      },
    }),
    [colors],
  );

  const config = configs[platform];
  const Icon = config.Icon;
  const [lastRoom, setLastRoom] = useState<VideoRoom | null>(null);
  const [lastRoomLoading, setLastRoomLoading] = useState(true);
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    void roomAPI
      .getLastRoom(config.roomType)
      .then(setLastRoom)
      .catch(() => setLastRoom(null))
      .finally(() => setLastRoomLoading(false));
  }, [config.roomType]);

  async function createRoom() {
    setCreateLoading(true);
    try {
      const room = await roomAPI.createRoom({ type: config.roomType });
      navigation.navigate(config.roomRoute, { id: room.id });
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create room",
      );
    } finally {
      setCreateLoading(false);
    }
  }

  async function joinRoom() {
    const id = roomIdToJoin.trim();
    if (!id) {
      Alert.alert("Error", "Please enter a room ID");
      return;
    }

    setJoinLoading(true);
    try {
      const room = await roomAPI.getRoom(id);
      if (room.type !== config.roomType) {
        Alert.alert("Error", `This is not a ${config.title} room`);
        return;
      }
      navigation.navigate(config.roomRoute, { id });
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Room not found",
      );
    } finally {
      setJoinLoading(false);
    }
  }

  if (lastRoomLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[commonStyles.screen, styles.container]}>
      <View style={styles.brand}>
        <View
          style={[
            styles.brandIcon,
            {
              backgroundColor: `${config.accent}08`,
              borderColor: `${config.accent}33`,
            },
          ]}
        >
          <Icon size={28} />
        </View>
        <View style={styles.brandText}>
          <Text style={commonStyles.eyebrow}>{config.tagline}</Text>
          <Text style={commonStyles.title}>{config.title}</Text>
          <Text style={commonStyles.subtitle}>{config.description}</Text>
        </View>
      </View>

      {lastRoom ? (
        <View style={styles.lastRoom}>
          <Text style={styles.lastRoomLabel}>Last room</Text>
          <Button
            title={`Rejoin ${lastRoom.id.slice(0, 8)}…`}
            variant="outline"
            onPress={() =>
              navigation.navigate(config.roomRoute, { id: lastRoom.id })
            }
          />
        </View>
      ) : null}

      <Button
        title={createLoading ? "Creating..." : "Create room"}
        loading={createLoading}
        onPress={createRoom}
        icon={
          !createLoading ? (
            <Plus size={16} color="#fff" weight="bold" />
          ) : undefined
        }
        style={[styles.createBtn, { backgroundColor: config.accent }]}
      />
      <Text style={styles.hint}>{config.createDescription}</Text>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.joinCard}>
        <Text style={styles.joinEyebrow}>Have an invite?</Text>
        <Text style={styles.joinLabel}>Join by room ID</Text>
        <View style={styles.joinRow}>
          <View style={styles.joinInputWrap}>
            <LinkSimple
              size={16}
              color={colors.muted}
              style={styles.linkIcon}
            />
            <Input
              value={roomIdToJoin}
              onChangeText={setRoomIdToJoin}
              placeholder="Paste room ID"
              autoCapitalize="none"
              style={styles.joinInput}
            />
          </View>
          <Button
            title={joinLoading ? "..." : "Join"}
            variant="outline"
            loading={joinLoading}
            onPress={joinRoom}
            style={styles.joinBtn}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      padding: 24,
      paddingTop: 16,
    },
    brand: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
      marginBottom: 8,
    },
    brandIcon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    brandText: {
      flex: 1,
    },
    lastRoom: {
      marginTop: 24,
      marginBottom: 8,
      gap: 8,
    },
    lastRoomLabel: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    createBtn: {
      marginTop: 16,
    },
    hint: {
      fontSize: 12,
      color: colors.muted,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 12,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginVertical: 8,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.muted,
    },
    joinCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 8,
    },
    joinEyebrow: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.muted,
    },
    joinLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 4,
    },
    joinRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    joinInputWrap: {
      flex: 1,
      position: "relative",
      justifyContent: "center",
    },
    linkIcon: {
      position: "absolute",
      left: 12,
      zIndex: 1,
    },
    joinInput: {
      paddingLeft: 36,
    },
    joinBtn: {
      width: 88,
    },
  });
}
