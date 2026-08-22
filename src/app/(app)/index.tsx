import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HabitFormModal } from '@/components/HabitFormModal';
import { HabitHeatmap, HeatmapDaySummary } from '@/components/HabitHeatmap';
import { HabitRow } from '@/components/HabitRow';
import { DayProgressCircles } from '@/components/DayProgressCircles';
import { Radii, Spacing, type ThemeColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import { useHabits } from '@/context/HabitsProvider';
import { useLocale } from '@/context/LocaleProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Habit } from '@/types';
import { formatLongDate, isFutureDate, parseDateKey, todayKey } from '@/utils/dates';
import { getCompletedHabitCount, getCurrentStreak, indexLogs } from '@/utils/heatmap';
import { getActiveHabitsForDate } from '@/utils/occurrence';
import { getFirstName, getFullName, getGreetingKey, getInitials } from '@/utils/profile';

export default function HomeScreen() {
  const { user } = useAuth();
  const { localeTag, t } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { habits, logs, isReady, addHabit, updateHabit, deleteHabit, incrementHabit, getCount } =
    useHabits();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [formVisible, setFormVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const logIndex = useMemo(() => indexLogs(logs), [logs]);
  const selectedIsToday = selectedDate === todayKey();
  const selectedIsFuture = isFutureDate(parseDateKey(selectedDate));
  const dayHabits = useMemo(
    () => getActiveHabitsForDate(habits, selectedDate),
    [habits, selectedDate],
  );
  const { completed, total } = getCompletedHabitCount(selectedDate, habits, logIndex);
  const streak = getCurrentStreak(habits, logIndex);

  const fullName = getFullName(user);
  const firstName = getFirstName(fullName);
  const greeting = useMemo(() => {
    const key = getGreetingKey(firstName);
    return firstName ? t(key, { name: firstName }) : t(key);
  }, [firstName, t]);
  const initials = useMemo(() => getInitials(fullName, user?.email), [fullName, user?.email]);

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
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push('/(app)/profile')}
            style={styles.avatarButton}
            accessibilityLabel={t('home.openProfile')}>
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>{formatLongDate(parseDateKey(selectedDate), localeTag)}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <DayProgressCircles completed={completed} total={total} />
            <Text style={styles.statLabel}>
              {selectedIsToday ? t('home.statToday') : t('home.statSelectedDay')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>{t('home.statStreak')}</Text>
          </View>
        </View>

        <View style={styles.heatmapWrap}>
          <HabitHeatmap
            habits={habits}
            logs={logs}
            selectedDate={selectedDate}
            userCreatedAt={user?.created_at}
            onSelectDate={setSelectedDate}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              {selectedIsToday ? t('home.todaysHabits') : t('home.habitsForDay')}
            </Text>
            <Pressable
              onPress={openCreate}
              style={styles.addButton}
              accessibilityLabel={t('home.addHabit')}>
              <Ionicons name="add" size={28} color={colors.onAccent} />
            </Pressable>
          </View>
          <View style={styles.sectionMeta}>
            <HeatmapDaySummary dateKey={selectedDate} habits={habits} logs={logs} />
            {!selectedIsToday ? (
              <Pressable onPress={() => setSelectedDate(todayKey())} style={styles.todayChip}>
                <Text style={styles.todayChipText}>{t('home.jumpToToday')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.list}>
          {dayHabits.length === 0 ? (
            <Pressable onPress={openCreate} style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {habits.length > 0 ? t('home.emptyScheduledTitle') : t('home.emptyTitle')}
              </Text>
              <Text style={styles.emptyBody}>
                {habits.length > 0 ? t('home.emptyScheduledBody') : t('home.emptyBody')}
              </Text>
            </Pressable>
          ) : (
            dayHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                count={getCount(habit.id, selectedDate)}
                disabled={selectedIsFuture}
                onToggle={() => incrementHabit(habit.id, selectedDate)}
                onEdit={() => openEdit(habit)}
              />
            ))
          )}
        </View>

        <Text style={styles.pausedHint}>{t('home.hint')}</Text>
      </ScrollView>

      <HabitFormModal
        visible={formVisible}
        habit={editingHabit}
        selectedDate={selectedDate}
        onClose={() => {
          setFormVisible(false);
          setEditingHabit(null);
        }}
        onSave={(draft) => {
          if (editingHabit) {
            void updateHabit(editingHabit.id, draft);
          } else {
            void addHabit(draft);
          }
        }}
        onDelete={
          editingHabit
            ? (mode) => {
                void deleteHabit(editingHabit.id, mode, selectedDate);
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    boot: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.xxl,
      gap: Spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      gap: Spacing.md,
    },
    avatarButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentDim,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '800',
    },
    headerCopy: {
      flex: 1,
    },
    greeting: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    date: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 2,
    },
    addButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.md,
      padding: Spacing.md,
    },
    statValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    heatmapWrap: {
      marginHorizontal: -Spacing.xs,
    },
    sectionHeader: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    sectionTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    sectionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    todayChip: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    todayChipText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    list: {
      flexDirection: 'column',
      gap: Spacing.sm,
    },
    empty: {
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radii.md,
      padding: Spacing.xl,
      alignItems: 'center',
      gap: Spacing.sm,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    emptyBody: {
      color: colors.textMuted,
      textAlign: 'center',
    },
    pausedHint: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
  });
}
