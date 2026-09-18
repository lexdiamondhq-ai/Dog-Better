import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type Props = {
  gait: SharedValue<number>;
  width: number;
  height: number;
};

/**
 * The original walking sticker, intact. Gait is a 60fps lean and plant, not a
 * flipbook, so the face never blinks while he crosses the screen.
 */
export function CartoonWalk({ gait, width, height }: Props) {
  const style = useAnimatedStyle(() => {
    const step = Math.sin(gait.value * 5 * Math.PI * 2);
    const plant = Math.abs(step);
    return {
      transform: [
        { translateY: -plant * 2.4 },
        { rotate: `${step * 3}deg` },
        { scaleY: 1 - (1 - plant) * 0.012 },
      ],
    };
  });

  return (
    <Animated.View style={[{ width, height, justifyContent: 'flex-end' }, style]}>
      <Image
        source={require('@/assets/brand/mascot-walking.png')}
        style={{ width, height }}
        contentFit="contain"
        recyclingKey="mascot-walk-still-v10"
      />
    </Animated.View>
  );
}
