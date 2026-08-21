import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HabitFormModal } from '@/components/HabitFormModal';
import { HabitHeatmap, HeatmapDaySummary } from '@/components/HabitHeatmap';
import { HabitRow } from '@/components/HabitRow';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useHabits } from '@/context/HabitsProvider';
import { Habit } from '@/types';
import { formatLongDate, parseDateKey, todayKey } from '@/utils/dates';
import { getCompletedHabitCount, getCurrentStreak, indexLogs } from '@/utils/heatmap';

export default function HomeScreen() {
  const { habits, logs, isReady, addHabit, updateHabit, deleteHabit, incrementHabit, getCount } =
    useHabits();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [formVisible, setFormVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const activeHabits = useMemo(
    () => habits.filter((habit) => habit.isActive),
    [habits],
  );
  const logIndex = useMemo(() => indexLogs(logs), [logs]);
  const selectedIsToday = selectedDate === todayKey();
  const { completed, total } = getCompletedHabitCount(selectedDate, habits, logIndex);
  const streak = getCurrentStreak(habits, logIndex);

  function openCreate() {
    setEditingHabit(null);
    setFormVisible(true);
  }

  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setFormVisible(true);
  }

  if (!isReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>GridHabits</Text>
            <Text style={styles.date}>{formatLongDate(parseDateKey(selectedDate))}</Text>
          </View>
          <Pressable onPress={openCreate} style={styles.addButton} accessibilityLabel="Add habit">
            <Ionicons name="add" size={22} color={Colors.background} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completed}/{total}</Text>
            <Text style={styles.statLabel}>{selectedIsToday ? 'Today' : 'Selected day'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
        </View>

        <HabitHeatmap
          habits={habits}
          logs={logs}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {selectedIsToday ? "Today's habits" : 'Habits for this day'}
            </Text>
            <HeatmapDaySummary dateKey={selectedDate} habits={habits} logs={logs} />
          </View>
          {!selectedIsToday ? (
            <Pressable onPress={() => setSelectedDate(todayKey())} style={styles.todayChip}>
              <Text style={styles.todayChipText}>Jump to today</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.list}>
          {activeHabits.length === 0 ? (
            <Pressable onPress={openCreate} style={styles.empty}>
              <Text style={styles.emptyTitle}>No active habits yet</Text>
              <Text style={styles.emptyBody}>Add a tiny daily action. One tap should complete it.</Text>
            </Pressable>
          ) : (
            activeHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                count={getCount(habit.id, selectedDate)}
                onToggle={() => incrementHabit(habit.id, selectedDate)}
                onEdit={() => openEdit(habit)}
              />
            ))
          )}
        </View>

        {habits.some((habit) => !habit.isActive) ? (
          <Text style={styles.pausedHint}>Inactive habits stay off the grid. Long-press a row to edit.</Text>
        ) : (
          <Text style={styles.pausedHint}>Tap to check off. Long-press to edit.</Text>
        )}
      </ScrollView>

      <HabitFormModal
        visible={formVisible}
        habit={editingHabit}
        onClose={() => {
          setFormVisible(false);
          setEditingHabit(null);
        }}
        onSave={(draft) => {
          if (editingHabit) {
            updateHabit(editingHabit.id, draft);
          } else {
            addHabit(draft);
          }
        }}
        onDelete={editingHabit ? deleteHabit : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  brand: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  date: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  statValue: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  todayChip: {
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayChipText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: Spacing.sm,
  },
  empty: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyBody: {
    color: Colors.textMuted,
    textAlign: 'center',
  },
  pausedHint: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
