import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface RadarPulseProps {
  color: string;
}

export const RadarPulse = React.memo(function RadarPulse({ color }: RadarPulseProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2400 }), -1, false);
  }, [progress]);

  const ringA = useAnimatedStyle(() => {
    const scale = 0.5 + progress.value * 1.5;
    const opacity = 0.35 - progress.value * 0.35;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const ringB = useAnimatedStyle(() => {
    const delayed = (progress.value + 0.5) % 1;
    const scale = 0.5 + delayed * 1.5;
    const opacity = 0.28 - delayed * 0.28;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={s.wrap} pointerEvents="none">
      <Animated.View style={[s.ring, { borderColor: color }, ringA]} />
      <Animated.View style={[s.ring, { borderColor: color }, ringB]} />
      <View style={[s.dot, { backgroundColor: color }]} />
    </View>
  );
});

const s = StyleSheet.create({
  wrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
