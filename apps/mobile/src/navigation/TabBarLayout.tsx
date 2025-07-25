import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, TabItem } from '@/components/ui/TabBar';
import { useTheme } from '@/hooks/useTheme';

const mainTabs: TabItem[] = [
  {
    name: 'dashboard',
    icon: 'home',
    label: 'Dashboard',
    route: '/dashboard',
  },
  {
    name: 'tasks',
    icon: 'checkmark-circle',
    label: 'Tasks',
    route: '/tasks',
  },
  {
    name: 'goals',
    icon: 'flag',
    label: 'Goals',
    route: '/goals',
  },
  {
    name: 'contacts',
    icon: 'people',
    label: 'Contacts',
    route: '/contacts',
  },
  {
    name: 'profile',
    icon: 'person',
    label: 'Profile',
    route: '/profile',
  },
];

export default function TabBarLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = createStyles(theme.colors.background);

  return (
    <View style={styles.container}>
      {/* Main content */}
      <View style={styles.content}>
        <Slot />
      </View>

      {/* Tab bar */}
      <TabBar tabs={mainTabs} theme={theme.mode} />
    </View>
  );
}

const createStyles = (backgroundColor: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
    },
    content: {
      flex: 1,
    },
  });