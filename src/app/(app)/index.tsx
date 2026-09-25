import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
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
import {
  applyVisibleOrder,
  groupPair,
  materializeOutline,
  placeHabit,
  placeOutlineItem,
  toOutlineItems,
  type OutlineItem,
} from '@/utils/outline';
import { createId } from '@/utils/ids';
import { getFirstName, getFullName, getGreetingKey, getInitials } from '@/utils/profile';

export default function HomeScreen() {
  const { user } = useAuth();
  const { localeTag, t } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    habits,
    sections,
    logs,
    isReady,
    addHabit,
    updateHabit,
    deleteHabit,
    renameSection,
    deleteSection,
    saveOutline,
    incrementHabit,
    getCount,
  } = useHabits();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [formVisible, setFormVisible] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [naming, setNaming] = useState(false);
  const [pendingPair, setPendingPair] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [createSectionId, setCreateSectionId] = useState<string | null>(null);
  const sectionsRef = useRef(sections);
  const habitsRef = useRef(habits);
  const saveRef = useRef(saveOutline);
  sectionsRef.current = sections;
  habitsRef.current = habits;
  saveRef.current = saveOutline;

  const logIndex = useMemo(() => indexLogs(logs), [logs]);
  const selectedIsToday = selectedDate === todayKey();
  const selectedIsFuture = isFutureDate(parseDateKey(selectedDate));
  const dayHabits = useMemo(
    () => getActiveHabitsForDate(habits, selectedDate),
    [habits, selectedDate],
  );
  const visibleItems = useMemo(() => {
    const due = new Set(dayHabits.map((habit) => habit.id));
    return toOutlineItems(sections, habits).filter(
      (item) => item.kind === 'section' || due.has(item.id),
    );
  }, [dayHabits, habits, sections]);
  const habitById = useMemo(() => new Map(habits.map((habit) => [habit.id, habit])), [habits]);
  const sectionById = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  const { completed, total } = getCompletedHabitCount(selectedDate, habits, logIndex);
  const streak = getCurrentStreak(habits, logIndex);

  const fullName = getFullName(user);
  const firstName = getFirstName(fullName);
  const greeting = useMemo(() => {
    const key = getGreetingKey(firstName);
    return firstName ? t(key, { name: firstName }) : t(key);
  }, [firstName, t]);
  const initials = useMemo(() => getInitials(fullName, user?.email), [fullName, user?.email]);

  function openCreate(sectionId: string | null = null) {
    setEditingHabit(null);
    setCreateSectionId(sectionId);
    setFormVisible(true);
  }

  function confirmRoutine() {
    const trimmed = routineName.trim();
    const pair = pendingPair;
    if (!trimmed || !pair) return;
    const sectionId = createId();
    const full = toOutlineItems(sectionsRef.current, habitsRef.current);
    const grouped = groupPair(full, pair.sourceId, pair.targetId, sectionId);
    const materialized = materializeOutline(
      grouped,
      [...sectionsRef.current, { id: sectionId, name: trimmed, sortOrder: sectionsRef.current.length }],
      habitsRef.current,
    );
    saveRef.current(materialized.sections, materialized.habits);
    setRoutineName('');
    setPendingPair(null);
    setNaming(false);
  }

  function commitOrder(order: OutlineItem[]) {
    const full = toOutlineItems(sectionsRef.current, habitsRef.current);
    const merged = applyVisibleOrder(full, order);
    const materialized = materializeOutline(merged, sectionsRef.current, habitsRef.current);
    saveRef.current(materialized.sections, materialized.habits);
  }

  const dragKey = useRef<string | null>(null);
  const dragY = useRef<number | null>(null);
  const boxes = useRef<Record<string, { y: number; height: number }>>({});

  function rememberBox(key: string, target: unknown) {
    const node = target as {
      measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
    } | null;
    node?.measureInWindow?.((_x, y, _width, height) => {
      if (height > 0) boxes.current[key] = { y, height };
    });
  }

  function habitUnderPointer(pointerY: number, ignoreId: string) {
    for (const item of visibleItems) {
      if (item.kind !== 'habit' || item.id === ignoreId) continue;
      const box = boxes.current[`habit:${item.id}`];
      if (!box || pointerY < box.y || pointerY > box.y + box.height) continue;
      const ratio = (pointerY - box.y) / box.height;
      if (ratio > 0.35 && ratio < 0.65) return item;
    }
    return null;
  }

  function assignSections(items: OutlineItem[]) {
    let sectionId: string | null = null;
    return items.map((item) => {
      if (item.kind === 'section') {
        sectionId = item.id;
        return item;
      }
      return { ...item, sectionId };
    });
  }

  function finishSort() {
    const key = dragKey.current;
    const pointerY = dragY.current;
    dragKey.current = null;
    dragY.current = null;
    setPrediction(null);
    if (!key || pointerY == null) return;
    const splitAt = key.indexOf(':');
    const kind = key.slice(0, splitAt);
    const id = key.slice(splitAt + 1);
    const fromIndex = visibleItems.findIndex((item) => item.kind === kind && item.id === id);
    if (fromIndex < 0) return;

    if (kind === 'habit') {
      const onto = habitUnderPointer(pointerY, id);
      if (onto?.kind === 'habit') {
        if (!onto.sectionId) {
          setPendingPair({ sourceId: id, targetId: onto.id });
          setRoutineName('');
          setNaming(true);
          return;
        }
        const targetIndex = visibleItems.findIndex((item) => item.kind === 'habit' && item.id === onto.id);
        commitOrder(placeHabit(visibleItems, fromIndex, targetIndex + 1, onto.sectionId));
        return;
      }
    }

    let toIndex = visibleItems.length;
    for (let index = 0; index < visibleItems.length; index += 1) {
      const item = visibleItems[index];
      if (!item || (item.kind === kind && item.id === id)) continue;
      const box = boxes.current[`${item.kind}:${item.id}`];
      if (box && pointerY < box.y + box.height / 2) {
        toIndex = index;
        break;
      }
    }
    if (kind === 'section') {
      commitOrder(placeOutlineItem(visibleItems, fromIndex, toIndex));
      return;
    }
    if (toIndex === fromIndex || toIndex === fromIndex + 1) return;
    commitOrder(assignSections(placeHabit(visibleItems, fromIndex, toIndex, null)));
  }

  function previewDrag(key: string, y: number) {
    dragKey.current = key;
    dragY.current = y;
    const habitId = key.startsWith('habit:') ? key.slice(6) : '';
    const onto = habitId ? habitUnderPointer(y, habitId) : null;
    const label =
      onto?.kind === 'habit'
        ? onto.sectionId
          ? t('drag.into', { name: sectionById.get(onto.sectionId)?.name ?? '' })
          : t('drag.combine', { name: habitById.get(onto.id)?.name ?? '' })
        : null;
    setPrediction((current) => (current === label ? current : label));
  }

  function renderOutlineItem(item: OutlineItem) {
    if (item.kind === 'section') {
      const section = sectionById.get(item.id);
      const hasHabits = visibleItems.some((entry) => entry.kind === 'habit' && entry.sectionId === item.id);
      return (
        <View
          key={`section:${item.id}`}
          onLayout={(event) => rememberBox(`section:${item.id}`, event.target)}
          style={styles.routineCard}>
          <View style={styles.groupHeader}>
            <DragGrip color={colors.text} onStart={() => previewDrag(`section:${item.id}`, boxes.current[`section:${item.id}`]?.y ?? 0)} onMove={(y) => previewDrag(`section:${item.id}`, y)} onEnd={finishSort} />
            <TextInput
              defaultValue={section?.name ?? ''}
              onEndEditing={(event) => renameSection(item.id, event.nativeEvent.text)}
              style={styles.groupTitle}
              maxLength={32}
            />
            <Pressable
              onPress={() => openCreate(item.id)}
              hitSlop={8}
              accessibilityLabel={t('home.addToRoutine', { name: section?.name ?? '' })}>
              <Ionicons name="add" size={18} color={colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => deleteSection(item.id)}
              hitSlop={8}
              accessibilityLabel={t('organize.deleteSection')}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
          {hasHabits ? null : <Text style={styles.dropHint}>{t('organize.emptySection')}</Text>}
        </View>
      );
    }

    const habit = habitById.get(item.id);
    if (!habit) return null;
    const grouped = Boolean(item.sectionId);
    return (
      <View
        key={`habit:${habit.id}`}
        onLayout={(event) => rememberBox(`habit:${habit.id}`, event.target)}
        style={[styles.habitLine, grouped && styles.habitGrouped]}>
        <DragGrip color={colors.textMuted} onStart={() => previewDrag(`habit:${habit.id}`, boxes.current[`habit:${habit.id}`]?.y ?? 0)} onMove={(y) => previewDrag(`habit:${habit.id}`, y)} onEnd={finishSort} />
        <View style={styles.habitTouch}>
          <HabitRow
            habit={habit}
            count={getCount(habit.id, selectedDate)}
            disabled={selectedIsFuture}
            onToggle={() => incrementHabit(habit.id, selectedDate)}
            onEdit={() => openEdit(habit)}
          />
        </View>
      </View>
    );
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
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
              onPress={() => openCreate()}
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

        {prediction ? (
          <View style={styles.prediction}>
            <Text style={styles.predictionText}>{prediction}</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {visibleItems.length === 0 ? (
            <Pressable onPress={() => openCreate()} style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {habits.length > 0 ? t('home.emptyScheduledTitle') : t('home.emptyTitle')}
              </Text>
              <Text style={styles.emptyBody}>
                {habits.length > 0 ? t('home.emptyScheduledBody') : t('home.emptyBody')}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.outline}>
              {visibleItems.map((item) => renderOutlineItem(item))}
            </View>
          )}
        </View>

        <Text style={styles.pausedHint}>{t('home.hint')}</Text>
      </ScrollView>

      <HabitFormModal
        visible={formVisible}
        habit={editingHabit}
        sections={sections}
        defaultSectionId={createSectionId}
        selectedDate={selectedDate}
        onClose={() => {
          setFormVisible(false);
          setEditingHabit(null);
          setCreateSectionId(null);
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
      <Modal visible={naming} transparent animationType="fade" onRequestClose={() => setNaming(false)}>
        <View style={styles.nameOverlay}>
          <View style={styles.nameCard}>
            <Text style={styles.nameTitle}>{t('arrange.nameTitle')}</Text>
            <Text style={styles.nameBody}>
              {t('arrange.nameBody', {
                first: habitById.get(pendingPair?.sourceId ?? '')?.name ?? '',
                second: habitById.get(pendingPair?.targetId ?? '')?.name ?? '',
              })}
            </Text>
            <TextInput
              value={routineName}
              onChangeText={setRoutineName}
              placeholder={t('organize.sectionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.routineInput}
              autoFocus
              maxLength={32}
              onSubmitEditing={confirmRoutine}
            />
            <View style={styles.nameActions}>
              <Pressable onPress={() => setNaming(false)} style={styles.nameCancel}>
                <Text style={styles.nameCancelText}>{t('form.cancel')}</Text>
              </Pressable>
              <Pressable onPress={confirmRoutine} style={styles.nameSave}>
                <Text style={styles.nameSaveText}>{t('arrange.create')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DragGrip({
  color,
  onStart,
  onMove,
  onEnd,
}: {
  color: string;
  onStart: () => void;
  onMove: (y: number) => void;
  onEnd: () => void;
}) {
  const startRef = useRef(onStart);
  const moveRef = useRef(onMove);
  const endRef = useRef(onEnd);
  startRef.current = onStart;
  moveRef.current = onMove;
  endRef.current = onEnd;
  const begin = useCallback(() => startRef.current(), []);
  const move = useCallback((y: number) => moveRef.current(y), []);
  const end = useCallback(() => endRef.current(), []);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(4)
        .onStart(() => {
          runOnJS(begin)();
        })
        .onUpdate((event) => {
          runOnJS(move)(event.absoluteY);
        })
        .onFinalize(() => {
          runOnJS(end)();
        }),
    [begin, end, move],
  );

  return (
    <GestureDetector gesture={pan}>
      <View>
        <Ionicons name="reorder-three" size={22} color={color} />
      </View>
    </GestureDetector>
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    organizeButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
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
      gap: Spacing.md,
    },
    outline: {
      gap: Spacing.sm,
    },
    group: {
      gap: Spacing.sm,
    },
    prediction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
    },
    predictionIn: {
      backgroundColor: colors.accentDim,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    predictionOut: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.textMuted,
    },
    predictionText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    looseZone: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: Radii.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    looseZoneActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    looseZoneText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    routineCard: {
      backgroundColor: colors.accentDim,
      borderColor: colors.accent,
      borderWidth: 1,
      borderRadius: Radii.lg,
      padding: Spacing.sm,
      gap: Spacing.sm,
    },
    routineCardActive: {
      borderWidth: 2,
    },
    routineBody: {
      gap: Spacing.sm,
      paddingLeft: Spacing.sm,
    },
    dropHint: {
      color: colors.textMuted,
      fontSize: 13,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.accent,
      borderRadius: Radii.md,
      paddingVertical: 14,
      textAlign: 'center',
    },
    onto: {
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: Radii.md,
      backgroundColor: colors.accentDim,
    },
    ontoLabel: {
      position: 'absolute',
      left: 36,
      right: 8,
      bottom: 6,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      zIndex: 2,
    },
    slotLine: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
      marginVertical: 4,
    },
    nameOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    nameCard: {
      backgroundColor: colors.surface,
      borderRadius: Radii.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    nameTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    nameBody: {
      color: colors.textMuted,
      fontSize: 14,
    },
    nameActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    nameCancel: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
    },
    nameCancelText: {
      color: colors.textMuted,
      fontWeight: '600',
    },
    nameSave: {
      backgroundColor: colors.accent,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
    },
    nameSaveText: {
      color: colors.onAccent,
      fontWeight: '700',
    },
    lifted: {
      opacity: 0.72,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: Radii.md,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    groupTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      paddingVertical: 8,
    },
    habitLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      width: '100%',
    },
    habitGrouped: {
      backgroundColor: colors.accentDim,
      borderRadius: Radii.md,
      paddingRight: Spacing.xs,
    },
    habitTouch: {
      flex: 1,
    },
    dropIndicator: {
      backgroundColor: colors.accent,
      height: 3,
      borderRadius: 2,
    },
    nudge: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuRow: {
      paddingVertical: 12,
    },
    menuText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    dropTarget: {
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    routineDraft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    routineInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.md,
      color: colors.text,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      fontSize: 16,
    },
    routineAdd: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
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
