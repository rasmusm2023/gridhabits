import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SegmentedProgress } from '@/components/SegmentedProgress';
import { Radii, Spacing, type ThemeColors } from '@/constants/theme';
import { useLocale } from '@/context/LocaleProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Habit, toFilledIconName } from '@/types';
import { getHabitProgress } from '@/utils/heatmap';
import { describeOccurrence } from '@/utils/occurrence';

type HabitRowProps = {
  habit: Habit;
  count: number;
  disabled?: boolean;
  onToggle: () => void;
  onEdit: () => void;
};

export function HabitRow({ habit, count, disabled = false, onToggle, onEdit }: HabitRowProps) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = getHabitProgress(habit, count);
  const complete = progress >= 1;
  const progressSv = useSharedValue(progress);
  const checkScale = useSharedValue(complete ? 1 : 0.85);
  const target = Math.max(1, habit.targetDailyCount);

  useEffect(() => {
    progressSv.value = withTiming(progress, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
    checkScale.value = withSpring(complete ? 1 : 0.85, {
      damping: 14,
      stiffness: 180,
    });
  }, [progress, complete, progressSv, checkScale]);

  // Partials stay very light; only full complete jumps to the stronger tint.
  const fillStyle = useAnimatedStyle(() => {
    const value = progressSv.value;
    return {
      opacity:
        value <= 0
          ? 0
          : interpolate(value, [0, 0.99, 1], [0.04, 0.11, 0.42]),
    };
  });

  const borderStyle = useAnimatedStyle(() => {
    const value = progressSv.value;
    return {
      borderColor:
        value <= 0
          ? colors.border
          : `rgba(${colors.successRgb}, ${interpolate(value, [0, 0.99, 1], [0.16, 0.24, 0.55]).toFixed(3)})`,
    };
  });

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  async function handlePress() {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics are unavailable on some devices.
      }
    }
    onToggle();
  }

  const nameColor = progress > 0 ? colors.textOnSuccess : colors.text;
  const metaColor = progress > 0 ? colors.metaOnSuccess : colors.textSecondary;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onEdit}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${count} of ${target}`}
      style={({ pressed }) => [pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
      <Animated.View style={[styles.card, borderStyle]}>
        <Animated.View pointerEvents="none" style={[styles.fill, fillStyle]} />
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={toFilledIconName(habit.icon) as keyof typeof Ionicons.glyphMap}
              size={20}
              color={habit.color}
            />
          </View>

          <View style={styles.copy}>
            <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
              {habit.name}
            </Text>
            <Text style={[styles.meta, { color: metaColor }]} numberOfLines={1}>
              {describeOccurrence(habit, t)}
            </Text>
          </View>

          <Animated.View style={checkStyle}>
            <SegmentedProgress
              count={count}
              total={target}
              size={36}
              trackColor={count > 0 ? colors.success : colors.border}
              fillColor={colors.success}
              checkColor={colors.onSuccess}
              gapColor={`rgba(${colors.successRgb}, ${count > 0 ? 0.18 : 0.12})`}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    fill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.success,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      zIndex: 1,
    },
    pressed: {
      opacity: 0.9,
    },
    disabled: {
      opacity: 0.55,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: Radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
    },
    copy: {
      flexGrow: 1,
      flexShrink: 1,
      marginRight: Spacing.md,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    meta: {
      fontSize: 12,
      fontWeight: '500',
    },
  });
}
