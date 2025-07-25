import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnapPoint?: number;
  enablePanDownToClose?: boolean;
  showHandle?: boolean;
  theme?: 'light' | 'dark';
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
  initialSnapPoint = 0,
  enablePanDownToClose = true,
  showHandle = true,
  theme = 'light',
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const snapPointsInPixels = snapPoints.map(point => SCREEN_HEIGHT * (1 - point));

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(snapPointsInPixels[initialSnapPoint]);
      backdropOpacity.value = withTiming(1);
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT);
      backdropOpacity.value = withTiming(0);
    }
  }, [visible, snapPointsInPixels, initialSnapPoint]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const closeBottomSheet = () => {
    translateY.value = withTiming(SCREEN_HEIGHT);
    backdropOpacity.value = withTiming(0);
    setTimeout(() => onClose(), 300);
  };

  const snapToPoint = (point: number) => {
    translateY.value = withSpring(point);
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startY: number }
  >({
    onStart: (_, context) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      const newTranslateY = context.startY + event.translationY;
      
      // Prevent dragging above the highest snap point
      translateY.value = Math.max(snapPointsInPixels[snapPointsInPixels.length - 1], newTranslateY);
    },
    onEnd: (event) => {
      const velocity = event.velocityY;
      const currentPosition = translateY.value;
      
      // Find the closest snap point
      let closestSnapPoint = snapPointsInPixels[0];
      let minDistance = Math.abs(currentPosition - closestSnapPoint);
      
      snapPointsInPixels.forEach(point => {
        const distance = Math.abs(currentPosition - point);
        if (distance < minDistance) {
          minDistance = distance;
          closestSnapPoint = point;
        }
      });
      
      // Consider velocity for better UX
      if (velocity > 500 && enablePanDownToClose) {
        // Fast downward swipe - close
        runOnJS(closeBottomSheet)();
      } else if (velocity < -500) {
        // Fast upward swipe - go to highest point
        translateY.value = withSpring(snapPointsInPixels[snapPointsInPixels.length - 1]);
      } else {
        // Snap to closest point
        if (closestSnapPoint === snapPointsInPixels[0] && enablePanDownToClose) {
          runOnJS(closeBottomSheet)();
        } else {
          translateY.value = withSpring(closestSnapPoint);
        }
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  const handleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [snapPointsInPixels[snapPointsInPixels.length - 1], snapPointsInPixels[0]],
      [1, 0.5],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  const styles = createStyles(theme, insets.bottom, keyboardHeight);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={closeBottomSheet}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.container, sheetStyle]}>
          {/* Handle */}
          {showHandle && (
            <Animated.View style={[styles.handleContainer, handleStyle]}>
              <View style={styles.handle} />
            </Animated.View>
          )}

          {/* Header */}
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeBottomSheet}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={styles.closeIcon.color} />
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
}

const createStyles = (theme: 'light' | 'dark', bottomInset: number, keyboardHeight: number) => {
  const isDark = theme === 'dark';
  
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: SCREEN_HEIGHT,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: Math.max(bottomInset, keyboardHeight),
    },
    handleContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: isDark ? '#4b5563' : '#d1d5db',
      borderRadius: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      flex: 1,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    closeIcon: {
      color: isDark ? '#ffffff' : '#1f2937',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
  });
};