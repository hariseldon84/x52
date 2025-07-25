import { useCallback, useRef } from 'react';
import { 
  PanGestureHandler, 
  PanGestureHandlerGestureEvent,
  TapGestureHandler,
  TapGestureHandlerGestureEvent,
  LongPressGestureHandler,
  LongPressGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import {
  useAnimatedGestureHandler,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedStyle,
} from 'react-native-reanimated';

// Swipe gesture hook
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocityThreshold = 500,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  velocityThreshold?: number;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number; startY: number }
  >({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: (event) => {
      const { translationX, translationY, velocityX, velocityY } = event;
      
      // Reset position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      
      // Determine swipe direction
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);
      const absVelX = Math.abs(velocityX);
      const absVelY = Math.abs(velocityY);
      
      // Horizontal swipe
      if (absX > absY && (absX > threshold || absVelX > velocityThreshold)) {
        if (translationX > 0 && onSwipeRight) {
          runOnJS(onSwipeRight)();
        } else if (translationX < 0 && onSwipeLeft) {
          runOnJS(onSwipeLeft)();
        }
      }
      // Vertical swipe
      else if (absY > absX && (absY > threshold || absVelY > velocityThreshold)) {
        if (translationY > 0 && onSwipeDown) {
          runOnJS(onSwipeDown)();
        } else if (translationY < 0 && onSwipeUp) {
          runOnJS(onSwipeUp)();
        }
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return {
    gestureHandler,
    animatedStyle,
    translateX,
    translateY,
  };
}

// Pull to refresh gesture hook
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}) {
  const translateY = useSharedValue(0);
  const isRefreshing = useSharedValue(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    
    isRefreshing.value = true;
    await onRefresh();
    isRefreshing.value = false;
    translateY.value = withTiming(0);
  }, [onRefresh, enabled]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startY: number }
  >({
    onStart: (_, context) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      if (!enabled || isRefreshing.value) return;
      
      const newTranslateY = context.startY + event.translationY;
      
      // Only allow pull down
      if (newTranslateY >= 0) {
        translateY.value = newTranslateY * 0.5; // Add resistance
      }
    },
    onEnd: (event) => {
      if (!enabled || isRefreshing.value) return;
      
      if (translateY.value > threshold) {
        runOnJS(refresh)();
      } else {
        translateY.value = withTiming(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const refreshIndicatorStyle = useAnimatedStyle(() => {
    const opacity = Math.min(translateY.value / threshold, 1);
    const scale = Math.min(translateY.value / threshold, 1);
    
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return {
    gestureHandler,
    animatedStyle,
    refreshIndicatorStyle,
    isRefreshing,
    translateY,
  };
}

// Long press gesture hook
export function useLongPress({
  onLongPress,
  onPress,
  minDuration = 500,
  maxDistance = 10,
}: {
  onLongPress?: () => void;
  onPress?: () => void;
  minDuration?: number;
  maxDistance?: number;
}) {
  const longPressRef = useRef<LongPressGestureHandler>(null);
  const tapRef = useRef<TapGestureHandler>(null);

  const onLongPressEvent = useCallback(
    (event: LongPressGestureHandlerGestureEvent) => {
      if (event.nativeEvent.state === State.ACTIVE && onLongPress) {
        onLongPress();
      }
    },
    [onLongPress]
  );

  const onTapEvent = useCallback(
    (event: TapGestureHandlerGestureEvent) => {
      if (event.nativeEvent.state === State.END && onPress) {
        onPress();
      }
    },
    [onPress]
  );

  return {
    longPressRef,
    tapRef,
    onLongPressEvent,
    onTapEvent,
    longPressProps: {
      ref: longPressRef,
      onGestureEvent: onLongPressEvent,
      minDurationMs: minDuration,
      maxDist: maxDistance,
    },
    tapProps: {
      ref: tapRef,
      onGestureEvent: onTapEvent,
      waitFor: longPressRef,
    },
  };
}

// Double tap gesture hook
export function useDoubleTap({
  onSingleTap,
  onDoubleTap,
  delay = 300,
}: {
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  delay?: number;
}) {
  const doubleTapRef = useRef<TapGestureHandler>(null);
  const singleTapRef = useRef<TapGestureHandler>(null);

  const onDoubleTapEvent = useCallback(
    (event: TapGestureHandlerGestureEvent) => {
      if (event.nativeEvent.state === State.END && onDoubleTap) {
        onDoubleTap();
      }
    },
    [onDoubleTap]
  );

  const onSingleTapEvent = useCallback(
    (event: TapGestureHandlerGestureEvent) => {
      if (event.nativeEvent.state === State.END && onSingleTap) {
        onSingleTap();
      }
    },
    [onSingleTap]
  );

  return {
    doubleTapRef,
    singleTapRef,
    onDoubleTapEvent,
    onSingleTapEvent,
    doubleTapProps: {
      ref: doubleTapRef,
      onGestureEvent: onDoubleTapEvent,
      numberOfTaps: 2,
    },
    singleTapProps: {
      ref: singleTapRef,
      onGestureEvent: onSingleTapEvent,
      numberOfTaps: 1,
      waitFor: doubleTapRef,
      delayTouchEndMs: delay,
    },
  };
}

// Scale gesture hook (pinch to zoom)
export function useScale({
  onScale,
  minScale = 0.5,
  maxScale = 3,
}: {
  onScale?: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
}) {
  const scale = useSharedValue(1);
  const baseScale = useSharedValue(1);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      baseScale.value = scale.value;
    },
    onActive: (event) => {
      const newScale = baseScale.value * event.scale;
      scale.value = Math.min(Math.max(newScale, minScale), maxScale);
      
      if (onScale) {
        runOnJS(onScale)(scale.value);
      }
    },
    onEnd: () => {
      baseScale.value = scale.value;
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const resetScale = useCallback(() => {
    scale.value = withSpring(1);
    baseScale.value = 1;
  }, []);

  return {
    gestureHandler,
    animatedStyle,
    scale,
    resetScale,
  };
}

// Combined gesture hook for complex interactions
export function useCombinedGestures({
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  onDoubleTap,
  onPullToRefresh,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  onPullToRefresh?: () => Promise<void>;
}) {
  const swipe = useSwipeGesture({ onSwipeLeft, onSwipeRight });
  const longPress = useLongPress({ onLongPress });
  const doubleTap = useDoubleTap({ onDoubleTap });
  const pullToRefresh = onPullToRefresh ? usePullToRefresh({ onRefresh: onPullToRefresh }) : null;

  return {
    swipe,
    longPress,
    doubleTap,
    pullToRefresh,
  };
}