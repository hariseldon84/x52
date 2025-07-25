import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from 'react-native';
import {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface SwipeAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  theme?: 'light' | 'dark';
}

export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 120,
  theme = 'light',
}: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const gestureRef = useRef<PanGestureHandler>(null);

  const executeAction = (action: SwipeAction) => {
    action.onPress();
    translateX.value = withSpring(0);
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      const newTranslateX = context.startX + event.translationX;
      
      // Limit swipe distance
      const maxLeft = leftActions.length > 0 ? threshold * leftActions.length : 0;
      const maxRight = rightActions.length > 0 ? -threshold * rightActions.length : 0;
      
      translateX.value = Math.max(maxRight, Math.min(maxLeft, newTranslateX));
    },
    onEnd: (event) => {
      const velocity = event.velocityX;
      const currentPosition = translateX.value;
      
      // Determine if we should snap to an action or return to center
      if (currentPosition > threshold / 2 && leftActions.length > 0) {
        // Swipe right - execute left action
        const actionIndex = Math.min(
          Math.floor(currentPosition / threshold),
          leftActions.length - 1
        );
        runOnJS(executeAction)(leftActions[actionIndex]);
      } else if (currentPosition < -threshold / 2 && rightActions.length > 0) {
        // Swipe left - execute right action
        const actionIndex = Math.min(
          Math.floor(Math.abs(currentPosition) / threshold),
          rightActions.length - 1
        );
        runOnJS(executeAction)(rightActions[actionIndex]);
      } else {
        // Return to center
        translateX.value = withSpring(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const leftActionsStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, threshold / 2, threshold],
      [0, 0.5, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [
        {
          translateX: interpolate(
            translateX.value,
            [0, threshold],
            [-20, 0],
            Extrapolate.CLAMP
          ),
        },
      ],
    };
  });

  const rightActionsStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-threshold, -threshold / 2, 0],
      [1, 0.5, 0],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [
        {
          translateX: interpolate(
            translateX.value,
            [-threshold, 0],
            [0, 20],
            Extrapolate.CLAMP
          ),
        },
      ],
    };
  });

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <Animated.View style={[styles.leftActions, leftActionsStyle]}>
          {leftActions.map((action, index) => (
            <View
              key={index}
              style={[
                styles.actionContainer,
                { backgroundColor: action.backgroundColor },
              ]}
            >
              <Ionicons name={action.icon} size={24} color={action.color} />
              <Text style={[styles.actionLabel, { color: action.color }]}>
                {action.label}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <Animated.View style={[styles.rightActions, rightActionsStyle]}>
          {rightActions.map((action, index) => (
            <View
              key={index}
              style={[
                styles.actionContainer,
                { backgroundColor: action.backgroundColor },
              ]}
            >
              <Ionicons name={action.icon} size={24} color={action.color} />
              <Text style={[styles.actionLabel, { color: action.color }]}>
                {action.label}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Main Card */}
      <PanGestureHandler ref={gestureRef} onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.card, cardStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const createStyles = (theme: 'light' | 'dark') => {
  const isDark = theme === 'dark';
  
  return StyleSheet.create({
    container: {
      position: 'relative',
    },
    card: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    leftActions: {
      position: 'absolute',
      left: 16,
      top: 4,
      bottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: -1,
    },
    rightActions: {
      position: 'absolute',
      right: 16,
      top: 4,
      bottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      zIndex: -1,
    },
    actionContainer: {
      width: 80,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      marginHorizontal: 4,
      paddingVertical: 12,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
      textAlign: 'center',
    },
  });
};