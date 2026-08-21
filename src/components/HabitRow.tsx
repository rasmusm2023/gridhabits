import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { Habit } from '@/types';
import { getHabitProgress } from '@/utils/heatmap';

type HabitRowProps = {
  habit: Habit;
  count: number;
  onToggle: () => void;
  onEdit: () => void;
};

export function HabitRow({ habit, count, onToggle, onEdit }: HabitRowProps) {
  const progress = getHabitProgress(habit, count);
  const complete = progress >= 1;

  async function handlePress() {
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
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${count} of ${habit.targetDailyCount}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, { backgroundColor: `${habit.color}22` }]}>
        <Ionicons name={habit.icon as keyof typeof Ionicons.glyphMap} size={20} color={habit.color} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.name}>{habit.name}</Text>
        <Text style={styles.meta}>
          {habit.category}
          {habit.targetDailyCount > 1 ? ` · ${count}/${habit.targetDailyCount}` : ''}
        </Text>
      </View>

      <View
        style={[
          styles.check,
          complete && { backgroundColor: habit.color, borderColor: habit.color },
        ]}>
        {complete ? (
          <Ionicons name="checkmark" size={16} color={Colors.background} />
        ) : count > 0 ? (
          <Text style={[styles.partial, { color: habit.color }]}>{count}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  pressed: {
    backgroundColor: Colors.surfaceHover,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partial: {
    fontSize: 12,
    fontWeight: '700',
  },
});
