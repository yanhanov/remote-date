import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { MagnifyingGlass, UserPlus } from "phosphor-react-native";
import type { AppScreenProps } from "@/app/navigation/types";
import { socialAPI } from "@/shared/api/social.api";
import type {
  FriendItem,
  FriendRequestItem,
  PublicUserSummary,
} from "@/shared/api/social.types";
import { FriendsMemberCard } from "@/features/friends/ui/FriendsMemberCard";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { createCommonStyles } from "@/shared/theme/styles";
import type { ThemeColors } from "@/shared/theme/colors";

type FriendsTab = "network" | "search";

export function FriendsScreen({ navigation }: AppScreenProps<"Friends">) {
  const { colors } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FriendsTab>("network");

  async function loadAll() {
    setIsLoading(true);
    try {
      const [friendsList, requests] = await Promise.all([
        socialAPI.getFriends(),
        socialAPI.getFriendRequests(),
      ]);
      setFriends(friendsList);
      setIncoming(requests.incoming);
      setOutgoing(requests.outgoing);
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to load friends",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        setSearchResults(await socialAPI.searchUsers(query));
      } catch (err: unknown) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Search failed",
        );
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function sendRequest(userId: string) {
    try {
      await socialAPI.sendFriendRequest(userId);
      Alert.alert("Success", "Friend request sent");
      await loadAll();
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to send request",
      );
    }
  }

  async function acceptRequest(requestId: string) {
    setActingRequestId(requestId);
    try {
      await socialAPI.acceptFriendRequest(requestId);
      Alert.alert("Success", "Friend request accepted");
      await loadAll();
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to accept request",
      );
    } finally {
      setActingRequestId(null);
    }
  }

  async function rejectRequest(requestId: string) {
    setActingRequestId(requestId);
    try {
      await socialAPI.rejectFriendRequest(requestId);
      Alert.alert("Success", "Request declined");
      await loadAll();
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to decline request",
      );
    } finally {
      setActingRequestId(null);
    }
  }

  const pendingCount = incoming.length + outgoing.length;

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.brand}>
        <Text style={commonStyles.eyebrow}>Social</Text>
        <Text style={commonStyles.title}>Friends</Text>
        <Text style={commonStyles.subtitle}>
          Manage your network or find someone new.
        </Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "network" && styles.tabActive]}
          onPress={() => setActiveTab("network")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "network" && styles.tabTextActive,
            ]}
          >
            My network{pendingCount ? ` (${pendingCount})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "search" && styles.tabActive]}
          onPress={() => setActiveTab("search")}
        >
          <MagnifyingGlass
            size={14}
            color={activeTab === "search" ? colors.foreground : colors.muted}
            weight="bold"
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "search" && styles.tabTextActive,
            ]}
          >
            Find people
          </Text>
        </Pressable>
      </View>

      {activeTab === "search" ? (
        <View style={styles.section}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Username, name or email"
            autoCapitalize="none"
          />
          {isSearching ? <LoadingSpinner /> : null}
          {!searchQuery.trim() ? (
            <Text style={styles.hint}>
              Start typing to discover people on Remote Date.
            </Text>
          ) : null}
          {searchResults.map((user) => (
            <FriendsMemberCard
              key={user.userId}
              user={user}
              subtitle={user.username ? `@${user.username}` : undefined}
              onPress={() =>
                navigation.navigate("UserProfile", { id: user.userId })
              }
              actions={
                user.relationship === "none" ? (
                  <Button
                    title="Add"
                    icon={
                      <UserPlus
                        size={14}
                        color={colors.primaryForeground}
                        weight="bold"
                      />
                    }
                    onPress={() => sendRequest(user.userId)}
                    style={styles.smallBtn}
                  />
                ) : undefined
              }
            />
          ))}
        </View>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : (
        <View style={styles.section}>
          {incoming.map((request) => (
            <FriendsMemberCard
              key={request.requestId}
              user={request}
              subtitle="Wants to be friends"
              onPress={() =>
                navigation.navigate("UserProfile", { id: request.userId })
              }
              actions={
                <View style={styles.actionRow}>
                  <Button
                    title="Accept"
                    onPress={() => acceptRequest(request.requestId)}
                    style={styles.smallBtn}
                  />
                  <Button
                    title="Decline"
                    variant="outline"
                    onPress={() => rejectRequest(request.requestId)}
                    style={styles.smallBtn}
                  />
                </View>
              }
            />
          ))}
          {outgoing.map((request) => (
            <FriendsMemberCard
              key={request.requestId}
              user={request}
              subtitle="Request sent"
              onPress={() =>
                navigation.navigate("UserProfile", { id: request.userId })
              }
              actions={
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => rejectRequest(request.requestId)}
                  style={styles.smallBtn}
                />
              }
            />
          ))}
          {friends.map((friend) => (
            <FriendsMemberCard
              key={friend.userId}
              user={friend}
              subtitle="Friends"
              onPress={() =>
                navigation.navigate("UserProfile", { id: friend.userId })
              }
              actions={
                <Button
                  title="Message"
                  variant="outline"
                  onPress={() =>
                    navigation.navigate("MessagesThread", {
                      userId: friend.userId,
                    })
                  }
                  style={styles.smallBtn}
                />
              }
            />
          ))}
          {!friends.length && !incoming.length && !outgoing.length ? (
            <Text style={styles.hint}>No friends yet. Try finding people.</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
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
      gap: 0,
    },
    tabs: {
      flexDirection: "row",
      marginTop: 24,
      marginBottom: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    tabActive: {
      backgroundColor: colors.background,
    },
    tabText: {
      fontSize: 14,
      color: colors.muted,
      fontWeight: "500",
    },
    tabTextActive: {
      color: colors.foreground,
      fontWeight: "600",
    },
    section: {
      gap: 10,
    },
    hint: {
      textAlign: "center",
      color: colors.muted,
      fontSize: 14,
      paddingVertical: 20,
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
    },
    smallBtn: {
      height: 36,
      paddingHorizontal: 12,
    },
  });
}
