import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightActions?: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    testID?: string;
  }>;
  theme?: 'light' | 'dark';
  transparent?: boolean;
}

export function NavigationHeader({
  title,
  subtitle,
  showBack = false,
  rightActions = [],
  theme = 'light',
  transparent = false,
}: NavigationHeaderProps) {
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.top, transparent);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={transparent ? 'transparent' : styles.container.backgroundColor}
        translucent={transparent}
      />
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Left side */}
          <View style={styles.leftSection}>
            {showBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackPress}
                activeOpacity={0.7}
                testID="header-back-button"
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={styles.icon.color}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Center */}
          <View style={styles.centerSection}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          {/* Right side */}
          <View style={styles.rightSection}>
            {rightActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={action.onPress}
                activeOpacity={0.7}
                testID={action.testID}
              >
                <Ionicons
                  name={action.icon}
                  size={24}
                  color={styles.icon.color}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </>
  );
}

const createStyles = (theme: 'light' | 'dark', topInset: number, transparent: boolean) => {
  const isDark = theme === 'dark';
  
  return StyleSheet.create({
    container: {
      backgroundColor: transparent ? 'transparent' : (isDark ? '#1a1a1a' : '#ffffff'),
      paddingTop: topInset,
      borderBottomWidth: transparent ? 0 : 1,
      borderBottomColor: isDark ? '#333333' : '#e0e0e0',
      ...Platform.select({
        ios: !transparent && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        android: !transparent && {
          elevation: 4,
        },
      }),
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      paddingHorizontal: 16,
    },
    leftSection: {
      width: 40,
      alignItems: 'flex-start',
    },
    centerSection: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 40,
      justifyContent: 'flex-end',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 2,
    },
    icon: {
      color: isDark ? '#ffffff' : '#1f2937',
    },
  });
};