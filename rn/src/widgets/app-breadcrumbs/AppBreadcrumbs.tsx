import { Fragment, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { useAppNavigation } from '@/app/navigation/use-app-navigation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';
import { useAppBreadcrumbs } from './use-app-breadcrumbs';

export function AppBreadcrumbs() {
  const { items } = useAppBreadcrumbs();
  const { navigate } = useAppNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root} accessibilityRole="header" accessibilityLabel="Breadcrumb">
      <View style={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Fragment key={`${item.label}-${index}`}>
              {item.route && !isLast ? (
                <Pressable
                  onPress={() => navigate(item.route!)}
                  style={({ pressed }) => [styles.linkWrap, pressed && styles.linkPressed]}
                  accessibilityRole="link"
                >
                  <Text style={styles.link} numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              ) : (
                <Text
                  style={[styles.page, isLast && styles.pageCurrent]}
                  numberOfLines={1}
                  accessibilityRole="text"
                >
                  {item.label}
                </Text>
              )}

              {!isLast ? (
                <View style={styles.separator} accessibilityElementsHidden importantForAccessibility="no">
                  <CaretRight size={14} color={colors.muted} weight="bold" />
                </View>
              ) : null}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    list: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    linkWrap: {
      maxWidth: '100%',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    linkPressed: {
      opacity: 0.7,
    },
    link: {
      fontSize: 14,
      color: colors.muted,
    },
    page: {
      fontSize: 14,
      color: colors.muted,
      maxWidth: '100%',
    },
    pageCurrent: {
      color: colors.foreground,
    },
    separator: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
