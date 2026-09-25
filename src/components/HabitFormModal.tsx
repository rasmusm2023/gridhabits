import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Radii, Spacing, type ThemeColors } from '@/constants/theme';
import { useLocale } from '@/context/LocaleProvider';
import { useTheme } from '@/context/ThemeProvider';
import type { TranslationKey } from '@/i18n';
import {
  HABIT_CATEGORIES,
  HABIT_COLORS,
  HABIT_ICONS,
  Habit,
  HabitDraft,
  HabitOccurrence,
  HabitSection,
  toFilledIconName,
} from '@/types';
import {
  ALL_MONTHS,
  OCCURRENCE_OPTIONS,
  SEASON_PRESETS,
  WEEKDAY_OPTIONS,
  defaultOccurrenceFields,
  isYearRound,
} from '@/utils/occurrence';

type HabitFormModalProps = {
  visible: boolean;
  habit?: Habit | null;
  sections: HabitSection[];
  defaultSectionId?: string | null;
  selectedDate: string;
  onClose: () => void;
  onSave: (draft: HabitDraft) => void;
  onDelete?: (mode: 'once' | 'future' | 'entire') => void;
};

export function HabitFormModal({
  visible,
  habit,
  sections,
  defaultSectionId = null,
  selectedDate,
  onClose,
  onSave,
  onDelete,
}: HabitFormModalProps) {
  const { localeTag, t } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(HABIT_CATEGORIES[0]);
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [icon, setIcon] = useState<string>(HABIT_ICONS[0]);
  const [targetDailyCount, setTargetDailyCount] = useState(1);
  const [occurrence, setOccurrence] = useState<HabitOccurrence>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [monthDays, setMonthDays] = useState<number[]>([1]);
  const [activeMonths, setActiveMonths] = useState<number[]>([...ALL_MONTHS]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const monthLabels = useMemo(
    () =>
      ALL_MONTHS.map((month) =>
        new Intl.DateTimeFormat(localeTag, { month: 'short' }).format(new Date(2024, month - 1, 1)),
      ),
    [localeTag],
  );

  useEffect(() => {
    if (!visible) return;
    setName(habit?.name ?? '');
    setCategory(habit?.category ?? HABIT_CATEGORIES[0]);
    setColor(habit?.color ?? HABIT_COLORS[0]);
    setIcon(toFilledIconName(habit?.icon ?? HABIT_ICONS[0]));
    setTargetDailyCount(habit?.targetDailyCount ?? 1);
    setOccurrence(habit?.occurrence ?? 'daily');
    setWeekdays(habit?.weekdays?.length ? habit.weekdays : [1]);
    setMonthDays(habit?.monthDays?.length ? habit.monthDays : [1]);
    setActiveMonths(habit?.activeMonths?.length ? habit.activeMonths : [...ALL_MONTHS]);
    setSectionId(habit?.sectionId ?? defaultSectionId);
    setDeleteOpen(false);
  }, [habit, visible]);

  function selectOccurrence(next: HabitOccurrence) {
    setOccurrence(next);
    if (next === 'weekly' && weekdays.length === 0) {
      setWeekdays([1]);
    }
    if (next === 'monthly' && monthDays.length === 0) {
      setMonthDays([1]);
    }
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    );
  }

  function applySeason(months: readonly number[]) {
    setActiveMonths((current) => {
      if (isYearRound(current)) return [...months];
      const hasAll = months.every((month) => current.includes(month));
      if (hasAll) {
        const next = current.filter((month) => !months.includes(month));
        return next.length > 0 ? next : [...months];
      }
      return [...new Set([...current, ...months])].sort((a, b) => a - b);
    });
  }

  function toggleActiveMonth(month: number) {
    setActiveMonths((current) => {
      const next = current.includes(month)
        ? current.filter((item) => item !== month)
        : [...current, month].sort((a, b) => a - b);
      return next;
    });
  }

  function toggleMonthDay(day: number) {
    setMonthDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b),
    );
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('form.nameRequiredTitle'), t('form.nameRequiredBody'));
      return;
    }

    if (occurrence === 'weekly' && weekdays.length === 0) {
      Alert.alert(t('form.pickWeekdaysTitle'), t('form.pickWeekdaysBody'));
      return;
    }

    if (occurrence === 'monthly' && monthDays.length === 0) {
      Alert.alert(t('form.pickDatesTitle'), t('form.pickDatesBody'));
      return;
    }

    if (activeMonths.length === 0) {
      Alert.alert(t('form.pickMonthsTitle'), t('form.pickMonthsBody'));
      return;
    }

    const occurrenceFields = defaultOccurrenceFields(occurrence);
    onSave({
      name: trimmed,
      category,
      color,
      icon: toFilledIconName(icon),
      targetDailyCount,
      isActive: true,
      occurrence,
      weekdays: occurrence === 'weekly' ? weekdays : occurrenceFields.weekdays,
      monthDays: occurrence === 'monthly' ? monthDays : occurrenceFields.monthDays,
      endedAt: habit?.endedAt ?? null,
      skippedDates: habit?.skippedDates ?? [],
      activeMonths: [...activeMonths].sort((a, b) => a - b),
      sectionId,
      sortOrder: habit?.sortOrder ?? 0,
    });
    onClose();
  }

  function chooseDelete(mode: 'once' | 'future' | 'entire') {
    if (!onDelete) return;
    setDeleteOpen(false);
    onDelete(mode);
    onClose();
  }

  function handleRequestClose() {
    if (deleteOpen) {
      setDeleteOpen(false);
      return;
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={deleteOpen ? () => setDeleteOpen(false) : onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>{habit ? t('form.editHabit') : t('form.newHabit')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={styles.label}>{t('form.name')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('form.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus={!habit}
              maxLength={32}
            />

            <Text style={styles.label}>{t('form.category')}</Text>
            <View style={styles.chipRow}>
              {HABIT_CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.chip, category === item && styles.chipActive]}>
                  <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
                    {t(`category.${item}` as TranslationKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('form.occurrence')}</Text>
            <View style={styles.chipRow}>
              {OCCURRENCE_OPTIONS.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => selectOccurrence(item.value)}
                  style={[styles.chip, occurrence === item.value && styles.chipActive]}>
                  <Text
                    style={[styles.chipText, occurrence === item.value && styles.chipTextActive]}>
                    {t(item.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {occurrence === 'weekly' ? (
              <>
                <Text style={styles.label}>{t('form.weekdays')}</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAY_OPTIONS.map((item) => {
                    const selected = weekdays.includes(item.day);
                    return (
                      <Pressable
                        key={`${item.shortKey}-${item.day}`}
                        onPress={() => toggleWeekday(item.day)}
                        style={[styles.weekdayChip, selected && styles.chipActive]}>
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {t(item.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {occurrence === 'monthly' ? (
              <>
                <Text style={styles.label}>{t('form.monthDates')}</Text>
                <View style={styles.monthGrid}>
                  {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                    const selected = monthDays.includes(day);
                    return (
                      <Pressable
                        key={day}
                        onPress={() => toggleMonthDay(day)}
                        style={[styles.monthDay, selected && styles.chipActive]}>
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.label}>{t('form.months')}</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setActiveMonths([...ALL_MONTHS])}
                style={[styles.chip, isYearRound(activeMonths) && styles.chipActive]}>
                <Text style={[styles.chipText, isYearRound(activeMonths) && styles.chipTextActive]}>
                  {t('form.monthsAll')}
                </Text>
              </Pressable>
              {SEASON_PRESETS.map((season) => {
                const selected =
                  !isYearRound(activeMonths) &&
                  season.months.every((month) => activeMonths.includes(month));
                return (
                  <Pressable
                    key={season.id}
                    onPress={() => applySeason(season.months)}
                    style={[styles.chip, selected && styles.chipActive]}>
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {t(season.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.chipRow}>
              {ALL_MONTHS.map((month) => {
                const selected = activeMonths.includes(month);
                return (
                  <Pressable
                    key={month}
                    onPress={() => toggleActiveMonth(month)}
                    style={[styles.chip, selected && styles.chipActive]}>
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {monthLabels[month - 1]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {sections.length > 0 ? (
              <>
                <Text style={styles.label}>{t('form.routine')}</Text>
                <View style={styles.chipRow}>
                  <Pressable
                    onPress={() => setSectionId(null)}
                    style={[styles.chip, sectionId === null && styles.chipActive]}>
                    <Text style={[styles.chipText, sectionId === null && styles.chipTextActive]}>
                      {t('form.noRoutine')}
                    </Text>
                  </Pressable>
                  {sections.map((section) => {
                    const selected = sectionId === section.id;
                    return (
                      <Pressable
                        key={section.id}
                        onPress={() => setSectionId(section.id)}
                        style={[styles.chip, selected && styles.chipActive]}>
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {section.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.label}>{t('form.color')}</Text>
            <View style={styles.swatchRow}>
              {HABIT_COLORS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setColor(item)}
                  style={[
                    styles.swatch,
                    { backgroundColor: item },
                    color === item && styles.swatchSelected,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.label}>{t('form.icon')}</Text>
            <View style={styles.iconRow}>
              {HABIT_ICONS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setIcon(item)}
                  style={[styles.iconButton, icon === item && { borderColor: color }]}>
                  <Ionicons
                    name={toFilledIconName(item) as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={icon === item ? color : colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('form.timesPerDay')}</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setTargetDailyCount((value) => Math.max(1, value - 1))}
                style={styles.stepButton}>
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <Text style={styles.stepValue}>{targetDailyCount}</Text>
              <Pressable
                onPress={() => setTargetDailyCount((value) => Math.min(12, value + 1))}
                style={styles.stepButton}>
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            {habit && onDelete ? (
              <Pressable onPress={() => setDeleteOpen(true)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>{t('form.delete')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveText}>
                {habit ? t('form.saveChanges') : t('form.addHabit')}
              </Text>
            </Pressable>
          </View>
        </View>

        {deleteOpen ? (
          <View style={styles.deleteOverlay} pointerEvents="box-none">
            <Pressable style={styles.deleteBackdrop} onPress={() => setDeleteOpen(false)} />
            <View style={styles.deleteSheet}>
              <Text style={styles.deleteSheetTitle}>
                {t('form.deleteTitle', { name: habit?.name ?? '' })}
              </Text>
              <Text style={styles.deleteSheetSubtitle}>
                {t('form.deleteSubtitle', { date: selectedDate })}
              </Text>

              <Pressable onPress={() => chooseDelete('once')} style={styles.deleteOption}>
                <Text style={styles.deleteOptionTitle}>{t('form.deleteOnce')}</Text>
                <Text style={styles.deleteOptionBody}>{t('form.deleteOnceBody')}</Text>
              </Pressable>

              <Pressable onPress={() => chooseDelete('future')} style={styles.deleteOption}>
                <Text style={styles.deleteOptionTitle}>{t('form.deleteFuture')}</Text>
                <Text style={styles.deleteOptionBody}>{t('form.deleteFutureBody')}</Text>
              </Pressable>

              <Pressable
                onPress={() => chooseDelete('entire')}
                style={[styles.deleteOption, styles.deleteOptionDanger]}>
                <Text style={[styles.deleteOptionTitle, styles.deleteOptionTitleDanger]}>
                  {t('form.deleteEntire')}
                </Text>
                <Text style={styles.deleteOptionBody}>{t('form.deleteEntireBody')}</Text>
              </Pressable>

              <Pressable onPress={() => setDeleteOpen(false)} style={styles.deleteCancel}>
                <Text style={styles.deleteCancelText}>{t('form.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xl,
      maxHeight: '88%',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: Spacing.sm,
      marginBottom: Spacing.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    form: {
      gap: Spacing.sm,
      paddingBottom: Spacing.lg,
    },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: Spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.md,
      color: colors.text,
      paddingHorizontal: Spacing.md,
      paddingVertical: 12,
      fontSize: 16,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    chip: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipActive: {
      backgroundColor: colors.accentDim,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.textMuted,
      fontSize: 13,
    },
    chipTextActive: {
      color: colors.accent,
      fontWeight: '600',
    },
    weekdayRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    weekdayChip: {
      width: 40,
      height: 40,
      borderRadius: Radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    monthDay: {
      width: 40,
      height: 40,
      borderRadius: Radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    swatchSelected: {
      borderWidth: 2,
      borderColor: colors.text,
    },
    iconRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: Radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    stepButton: {
      width: 40,
      height: 40,
      borderRadius: Radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    stepValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      minWidth: 28,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingTop: Spacing.sm,
    },
    deleteButton: {
      flex: 1,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: 'center',
      paddingVertical: 14,
    },
    deleteText: {
      color: colors.danger,
      fontWeight: '700',
    },
    saveButton: {
      flex: 2,
      borderRadius: Radii.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      paddingVertical: 14,
    },
    saveText: {
      color: colors.onAccent,
      fontWeight: '700',
      fontSize: 16,
    },
    deleteOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'flex-end',
      zIndex: 20,
    },
    deleteBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    deleteSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.xl,
      gap: Spacing.sm,
    },
    deleteSheetTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    deleteSheetSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      marginBottom: Spacing.sm,
    },
    deleteOption: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radii.md,
      padding: Spacing.md,
      gap: 4,
      backgroundColor: colors.background,
    },
    deleteOptionDanger: {
      borderColor: colors.danger,
    },
    deleteOptionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    deleteOptionTitleDanger: {
      color: colors.danger,
    },
    deleteOptionBody: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    deleteCancel: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    deleteCancelText: {
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: 15,
    },
  });
}
