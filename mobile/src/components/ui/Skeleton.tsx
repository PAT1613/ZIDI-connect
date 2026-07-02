import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

/**
 * Lightweight shimmer skeleton. Uses reanimated (already installed) — no new
 * dep. Composable: pass through width/height/rounded via className OR style.
 */
interface Props {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ className = '', style }: Props) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[animated, style]}
      className={`bg-ink-200 rounded-md ${className}`}
    />
  );
}

/** Convenience: N rows of card-shaped skeletons for list screens. */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View className="p-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="rounded-2xl bg-white p-4 shadow-sm gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </View>
      ))}
    </View>
  );
}

/** For the dashboard — mimics the 2×N grid of stat cards. */
export function DashboardSkeleton() {
  return (
    <View className="p-4 gap-4">
      {[0, 1, 2, 3].map((row) => (
        <View key={row} className="flex-row gap-3">
          {[0, 1].map((col) => (
            <View
              key={col}
              className="flex-1 rounded-2xl bg-white p-4 shadow-sm gap-2"
            >
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
