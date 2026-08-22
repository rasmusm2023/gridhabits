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

  const fillStyle = useAnimatedStyle(() => {
    const t = progressSv.value;
    return {
      opacity: t <= 0 ? 0 : interpolate(t, [0, 1], [0.22, 0.8]),
    };
  });

  const borderStyle = useAnimatedStyle(() => {
    const t = progressSv.value;
    return {
      borderColor:
        t <= 0
          ? colors.border
          : `rgba(74, 222, 128, ${interpolate(t, [0, 1], [0.4, 0.9]).toFixed(3)})`,
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

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onEdit}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${count} of ${habit.targetDailyCount}`}
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
            <Text style={styles.name} numberOfLines={1}>
              {habit.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {describeOccurrence(habit, t)}
              {habit.targetDailyCount > 1 ? ` · ${count}/${habit.targetDailyCount}` : ''}
            </Text>
          </View>

          <Animated.View
            style={[
              styles.check,
              count > 0 && { borderColor: colors.accent },
              complete && { backgroundColor: colors.accent, borderColor: colors.accent },
              checkStyle,
            ]}>
            {complete ? (
              <Ionicons name="checkmark" size={16} color={colors.onAccent} />
            ) : count > 0 ? (
              <Text style={styles.partialCount}>{count}</Text>
            ) : null}
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
      backgroundColor: colors.accent,
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
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    copy: {
      flexGrow: 1,
      flexShrink: 1,
      marginRight: Spacing.md,
    },
    name: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    meta: {
      color: 'rgba(230, 237, 243, 0.88)',
      fontSize: 12,
    },
    check: {
      width: 28,
      height: 28,
      borderRadius: Radii.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    partialCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
    },
  });
}
