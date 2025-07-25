import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface FABAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
}

interface FloatingActionButtonProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  actions?: FABAction[];
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'small' | 'medium' | 'large';
}

export function FloatingActionButton({
  icon = 'add',
  onPress,
  actions = [],
  theme = 'light',
  position = 'bottom-right',
  size = 'medium',
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const animatedValue = useSharedValue(0);

  const hasActions = actions.length > 0;

  const handleMainPress = () => {
    if (hasActions) {
      setIsExpanded(!isExpanded);
      animatedValue.value = withSpring(isExpanded ? 0 : 1);
    } else if (onPress) {
      onPress();
    }
  };

  const handleActionPress = (action: FABAction) => {
    action.onPress();
    setIsExpanded(false);
    animatedValue.value = withSpring(0);
  };

  const mainButtonStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      animatedValue.value,
      [0, 1],
      [0, hasActions ? 45 : 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedValue.value,
      [0, 1],
      [0, 0.5],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      pointerEvents: isExpanded ? 'auto' : 'none',
    };
  });

  const styles = createStyles(theme, position, size, insets.bottom);

  return (
    <>
      {/* Backdrop */}
      {hasActions && (
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setIsExpanded(false);
              animatedValue.value = withSpring(0);
            }}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Action Items */}
      {hasActions && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => {
            const actionStyle = useAnimatedStyle(() => {
              const translateY = interpolate(
                animatedValue.value,
                [0, 1],
                [0, -(60 * (index + 1))],
                Extrapolate.CLAMP
              );

              const opacity = interpolate(
                animatedValue.value,
                [0, 0.3, 1],
                [0, 0, 1],
                Extrapolate.CLAMP
              );

              const scale = interpolate(
                animatedValue.value,
                [0, 1],
                [0.8, 1],
                Extrapolate.CLAMP
              );

              return {
                transform: [{ translateY }, { scale }],
                opacity,
              };
            });

            return (
              <Animated.View key={index} style={[styles.actionItem, actionStyle]}>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: action.backgroundColor || styles.actionButton.backgroundColor },
                  ]}
                  onPress={() => handleActionPress(action)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={action.icon}
                    size={20}
                    color={action.color || styles.actionIcon.color}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* Main FAB */}
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleMainPress}
          activeOpacity={0.8}
        >
          <Animated.View style={mainButtonStyle}>
            <Ionicons
              name={icon}
              size={styles.icon.fontSize}
              color={styles.icon.color}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}

const createStyles = (
  theme: 'light' | 'dark',
  position: 'bottom-right' | 'bottom-left' | 'bottom-center',
  size: 'small' | 'medium' | 'large',
  bottomInset: number
) => {
  const isDark = theme === 'dark';
  
  const fabSizes = {
    small: { width: 48, height: 48, iconSize: 20 },
    medium: { width: 56, height: 56, iconSize: 24 },
    large: { width: 64, height: 64, iconSize: 28 },
  };

  const fabSize = fabSizes[size];

  const getPosition = () => {
    switch (position) {
      case 'bottom-left':
        return { bottom: 16 + bottomInset, left: 16 };
      case 'bottom-center':
        return { bottom: 16 + bottomInset, alignSelf: 'center' };
      case 'bottom-right':
      default:
        return { bottom: 16 + bottomInset, right: 16 };
    }
  };

  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      zIndex: 999,
    },
    container: {
      position: 'absolute',
      ...getPosition(),
      zIndex: 1000,
    },
    fab: {
      width: fabSize.width,
      height: fabSize.height,
      borderRadius: fabSize.width / 2,
      backgroundColor: isDark ? '#3b82f6' : '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    icon: {
      fontSize: fabSize.iconSize,
      color: '#ffffff',
    },
    actionsContainer: {
      position: 'absolute',
      ...getPosition(),
      zIndex: 1001,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    actionLabel: {
      backgroundColor: isDark ? '#374151' : '#ffffff',
      color: isDark ? '#ffffff' : '#1f2937',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      fontSize: 14,
      fontWeight: '500',
      marginRight: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? '#4b5563' : '#f3f4f6',
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    actionIcon: {
      color: isDark ? '#ffffff' : '#1f2937',
    },
  });
};