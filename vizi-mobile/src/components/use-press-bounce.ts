import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { getSettings } from '@/lib/settings';

const PRESSED_SCALE = 0.95;
const SPRING_CONFIG = { damping: 12, stiffness: 220 };

// Shared press feedback for buttons: a subtle bouncy scale-down on press,
// plus a light haptic tap (respecting the user's haptics setting). Skips the
// scale animation when the OS reduce-motion setting is on, but still fires
// haptics per the user's preference.
export function usePressBounce() {
  const scale = useSharedValue(1);
  const reduceMotion = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) {
        reduceMotion.current = enabled;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (!reduceMotion.current) {
      scale.value = withSpring(PRESSED_SCALE, SPRING_CONFIG);
    }
    try {
      if (getSettings().haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch {}
  };

  const onPressOut = () => {
    if (!reduceMotion.current) {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  };

  return { animatedStyle, onPressIn, onPressOut };
}
