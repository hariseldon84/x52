import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  theme?: 'light' | 'dark';
  showLastUpdate?: boolean;
  lastUpdateTime?: Date;
}

export function PullToRefresh({
  children,
  onRefresh,
  refreshing: externalRefreshing,
  theme = 'light',
  showLastUpdate = true,
  lastUpdateTime,
}: PullToRefreshProps) {
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const isRefreshing = externalRefreshing ?? internalRefreshing;

  const handleRefresh = async () => {
    if (externalRefreshing === undefined) {
      setInternalRefreshing(true);
    }
    
    try {
      await onRefresh();
    } finally {
      if (externalRefreshing === undefined) {
        setInternalRefreshing(false);
      }
    }
  };

  const formatLastUpdate = (date?: Date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const styles = createStyles(theme);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={styles.refreshIndicator.color}
          colors={[styles.refreshIndicator.color]}
          progressBackgroundColor={styles.refreshBackground.backgroundColor}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Refresh Status Header */}
      {showLastUpdate && (
        <View style={styles.refreshHeader}>
          <View style={styles.refreshInfo}>
            <Ionicons
              name="refresh"
              size={16}
              color={styles.refreshText.color}
              style={[
                styles.refreshIcon,
                isRefreshing && styles.refreshIconSpinning,
              ]}
            />
            <Text style={styles.refreshText}>
              Last updated: {formatLastUpdate(lastUpdateTime)}
            </Text>
          </View>
          
          {isRefreshing && (
            <View style={styles.refreshingIndicator}>
              <ActivityIndicator
                size="small"
                color={styles.refreshIndicator.color}
              />
              <Text style={styles.refreshingText}>Refreshing...</Text>
            </View>
          )}
        </View>
      )}

      {children}

      {/* Loading footer for additional content */}
      {isRefreshing && (
        <View style={styles.loadingFooter}>
          <ActivityIndicator
            size="large"
            color={styles.refreshIndicator.color}
          />
          <Text style={styles.loadingText}>Updating content...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: 'light' | 'dark') => {
  const isDark = theme === 'dark';
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#f9fafb',
    },
    refreshHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
    },
    refreshInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    refreshIcon: {
      marginRight: 8,
    },
    refreshIconSpinning: {
      // Add rotation animation if needed
    },
    refreshText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
    },
    refreshingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      paddingVertical: 4,
    },
    refreshingText: {
      fontSize: 12,
      color: isDark ? '#3b82f6' : '#2563eb',
      marginLeft: 8,
      fontWeight: '500',
    },
    refreshIndicator: {
      color: isDark ? '#3b82f6' : '#2563eb',
    },
    refreshBackground: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
    },
    loadingFooter: {
      alignItems: 'center',
      paddingVertical: 20,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      marginTop: 16,
      marginHorizontal: 16,
      borderRadius: 12,
    },
    loadingText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 8,
      fontWeight: '500',
    },
  });
};