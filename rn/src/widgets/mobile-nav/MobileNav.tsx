import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, Users, ChatCircle, type Icon } from "phosphor-react-native";
import { useAppNavigation } from "@/app/navigation/use-app-navigation";
import { useAuth } from "@/entities/user/model/auth.store";
import { UserAvatar } from "@/entities/user/ui/UserAvatar";
import { useTheme } from "@/shared/theme/ThemeProvider";
import type { ThemeColors } from "@/shared/theme/colors";
import { useAppNav, type AppNavTarget } from "@/widgets/app-nav/use-app-nav";

export const MOBILE_NAV_HEIGHT = 68;

type NavItem =
  | { title: string; route: AppNavTarget; icon: Icon }
  | { title: string; route: AppNavTarget; isProfile: true };

const items: NavItem[] = [
  { title: "Home", route: "Home", icon: House },
  { title: "Friends", route: "Friends", icon: Users },
  { title: "Messages", route: "Messages", icon: ChatCircle },
  { title: "Profile", route: "Profile", isProfile: true },
];

export function MobileNav() {
  const { navigate } = useAppNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isNavActive } = useAppNav();
  const styles = useMemo(
    () => createStyles(colors, insets.bottom),
    [colors, insets.bottom],
  );

  return (
    <View style={styles.container} accessibilityRole="tablist">
      <View style={styles.inner}>
        {items.map((item) => {
          const active = isNavActive(item.route);
          const NavIcon = "icon" in item ? item.icon : null;

          return (
            <Pressable
              key={item.route}
              onPress={() => navigate(item.route)}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              {"isProfile" in item && user ? (
                <View style={styles.avatarWrap}>
                  {active ? <View style={styles.avatarRing} /> : null}
                  <UserAvatar user={user} size={24} />
                </View>
              ) : NavIcon ? (
                <NavIcon
                  size={24}
                  weight={active ? "fill" : "regular"}
                  color={active ? colors.primary : colors.muted}
                />
              ) : null}
              <Text
                style={[styles.label, active && styles.labelActive]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    container: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      paddingBottom: bottomInset,
    },
    inner: {
      height: MOBILE_NAV_HEIGHT,
      flexDirection: "row",
      alignItems: "stretch",
      justifyContent: "space-around",
      paddingHorizontal: 8,
      paddingTop: 6,
    },
    item: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 4,
      ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
    },
    itemPressed: {
      opacity: 0.75,
    },
    label: {
      fontSize: 10,
      fontWeight: "500",
      color: colors.muted,
      maxWidth: "100%",
    },
    labelActive: {
      color: colors.primary,
    },
    avatarWrap: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarRing: {
      position: "absolute",
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.primary,
    },
  });
}
