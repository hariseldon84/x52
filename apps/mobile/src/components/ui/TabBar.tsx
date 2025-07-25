import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';

export interface TabItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

interface TabBarProps {
  tabs: TabItem[];
  theme?: 'light' | 'dark';
}

export function TabBar({ tabs, theme = 'light' }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const handleTabPress = (route: string) => {
    router.push(route);
  };

  const isActive = (route: string) => {
    return pathname === route || pathname.startsWith(route + '/');
  };

  const styles = createStyles(theme, insets.bottom);

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = isActive(tab.route);
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, active && styles.activeIconContainer]}>
              <Ionicons
                name={tab.icon}
                size={24}
                color={active ? styles.activeIcon.color : styles.icon.color}
              />
            </View>
            <Text style={[styles.label, active && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: 'light' | 'dark', bottomInset: number) => {
  const isDark = theme === 'dark';
  
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#333333' : '#e0e0e0',
      paddingBottom: bottomInset > 0 ? bottomInset : 16,
      paddingTop: 8,
      paddingHorizontal: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    activeIconContainer: {
      backgroundColor: isDark ? '#2563eb20' : '#2563eb20',
    },
    icon: {
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    activeIcon: {
      color: isDark ? '#3b82f6' : '#2563eb',
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
    },
    activeLabel: {
      color: isDark ? '#3b82f6' : '#2563eb',
      fontWeight: '600',
    },
  });
};