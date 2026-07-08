import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { ChatsCircle } from "phosphor-react-native";
import type { AppScreenProps } from "@/app/navigation/types";
import { socialAPI } from "@/shared/api/social.api";
import type { ConversationItem } from "@/shared/api/social.types";
import { UserAvatar } from "@/entities/user/ui/UserAvatar";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { createCommonStyles } from "@/shared/theme/styles";
import type { ThemeColors } from "@/shared/theme/colors";

export function MessagesScreen({ navigation }: AppScreenProps<"Messages">) {
  const { colors } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void socialAPI
      .getConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <View style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <ChatsCircle size={28} color={colors.primary} weight="duotone" />
          </View>
          <View>
            <Text style={commonStyles.eyebrow}>Social</Text>
            <Text style={commonStyles.title}>Messages</Text>
          </View>
        </View>
      </View>

      {conversations.length === 0 ? (
        <Text style={styles.empty}>
          No conversations yet. Add friends to start chatting.
        </Text>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate("MessagesThread", { userId: item.userId })
              }
            >
              <UserAvatar user={item} size="md" />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  {item.lastMessageAt ? (
                    <Text style={styles.time}>
                      {formatTime(item.lastMessageAt)}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessageText || "No messages yet"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      padding: 24,
      paddingTop: 48,
      paddingBottom: 12,
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
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
    empty: {
      textAlign: "center",
      color: colors.muted,
      padding: 24,
      fontSize: 14,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    name: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      flex: 1,
    },
    time: {
      fontSize: 12,
      color: colors.muted,
    },
    preview: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
  });
}
