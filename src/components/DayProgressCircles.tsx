import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeProvider';

type DayProgressCirclesProps = {
  completed: number;
  total: number;
};

function ProgressCircle({ filled, index }: { filled: boolean; index: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(filled ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [filled, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.55 + progress.value * 0.45 }],
  }));

  return (
    <View
      accessibilityLabel={filled ? `Habit ${index + 1} complete` : `Habit ${index + 1} incomplete`}
      style={styles.circle}>
      <Animated.View style={[styles.circleFill, fillStyle]} />
    </View>
  );
}

export function DayProgressCircles({ completed, total }: DayProgressCirclesProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (total <= 0) {
    return <Text style={styles.empty}>No habits today</Text>;
  }

  return (
    <View style={styles.row} accessibilityLabel={`${completed} of ${total} habits complete`}>
      {Array.from({ length: total }, (_, index) => (
        <ProgressCircle key={index} index={index} filled={index < completed} />
      ))}
    </View>
  );
}

const CIRCLE = 14;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 7,
      minHeight: 28,
    },
    circle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    circleFill: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      backgroundColor: colors.accent,
    },
    empty: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      minHeight: 28,
      textAlignVertical: 'center',
    },
  });
}
