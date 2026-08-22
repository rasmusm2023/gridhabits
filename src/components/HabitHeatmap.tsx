import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Radii, Spacing, type ThemeColors } from '@/constants/theme';
import { useLocale } from '@/context/LocaleProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Habit, HabitLog } from '@/types';
import {
  formatShortDate,
  isFutureDate,
  isToday,
  monthLabel,
  toDateKey,
} from '@/utils/dates';
import {
  buildHeatmapWeeksForYear,
  findWeekIndexForDate,
  getAvailableTrackingYears,
  getCompletedHabitCount,
  getDayCompletionRatio,
  getHeatmapColor,
  indexLogs,
} from '@/utils/heatmap';
import { WEEKDAY_OPTIONS } from '@/utils/occurrence';

const CELL_SIZE = 18;
const CELL_GAP = 4;
const WEEK_SIZE = CELL_SIZE + CELL_GAP;
const DAY_LABEL_WIDTH = 22;
const DAY_LABEL_GAP = 4;
const MONTH_ROW_HEIGHT = 16;

function estimateViewportWidth() {
  return Math.max(
    200,
    Dimensions.get('window').width -
      Spacing.md * 2 -
      Spacing.md * 2 -
      DAY_LABEL_WIDTH -
      DAY_LABEL_GAP,
  );
}

function scrollOffsetForWeek(weekIndex: number, viewportWidth: number) {
  const columnCenter =
    DAY_LABEL_WIDTH + DAY_LABEL_GAP + weekIndex * WEEK_SIZE + WEEK_SIZE / 2;
  return Math.max(0, columnCenter - viewportWidth / 2);
}

type HabitHeatmapProps = {
  habits: Habit[];
  logs: HabitLog[];
  selectedDate: string;
  userCreatedAt?: string | null;
  onSelectDate?: (dateKey: string) => void;
  accentColor?: string;
};

type CellProps = {
  date: Date;
  color: string;
  selected: boolean;
  future: boolean;
  today: boolean;
  dimmed: boolean;
  localeTag: string;
  onPress?: () => void;
};

const HeatmapCell = memo(function HeatmapCell({
  date,
  color,
  selected,
  future,
  today,
  dimmed,
  localeTag,
  onPress,
}: CellProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatShortDate(date, localeTag)}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.cell,
        {
          backgroundColor: color,
          opacity: future ? 0.4 : dimmed ? 0.28 : 1,
        },
        today && styles.todayCell,
        selected && styles.selectedCell,
      ]}
    />
  );
});

export function HabitHeatmap({
  habits,
  logs,
  selectedDate,
  userCreatedAt,
  onSelectDate,
  accentColor,
}: HabitHeatmapProps) {
  const { localeTag, t } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const heatAccent = accentColor ?? colors.accent;
  const currentYear = new Date().getFullYear();
  const dayLabels = useMemo(() => WEEKDAY_OPTIONS.map((option) => t(option.labelKey)), [t]);
  const availableYears = useMemo(
    () => getAvailableTrackingYears({ userCreatedAt, habits, logs }),
    [userCreatedAt, habits, logs],
  );
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] ?? currentYear);
    }
  }, [availableYears, selectedYear, currentYear]);

  const scrollRef = useRef<ScrollView>(null);
  const viewportWidthRef = useRef(estimateViewportWidth());
  const hasCenteredRef = useRef(false);

  const weeks = useMemo(() => buildHeatmapWeeksForYear(selectedYear), [selectedYear]);
  const logIndex = useMemo(() => indexLogs(logs), [logs]);
  const focusWeekIndex = useMemo(() => {
    if (selectedYear === currentYear) {
      return findWeekIndexForDate(weeks, new Date());
    }
    return Math.floor(weeks.length / 2);
  }, [weeks, selectedYear, currentYear]);

  const initialOffset = useMemo(
    () => scrollOffsetForWeek(focusWeekIndex, estimateViewportWidth()),
    [focusWeekIndex],
  );

  const ratios = useMemo(() => {
    const map = new Map<string, number>();
    for (const week of weeks) {
      for (const date of week) {
        const key = toDateKey(date);
        map.set(key, getDayCompletionRatio(key, habits, logIndex));
      }
    }
    return map;
  }, [habits, logIndex, weeks]);

  const legendColors = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    getHeatmapColor(ratio, heatAccent, colors.emptyCell),
  );

  const centerOnFocus = useCallback(() => {
    const targetX = scrollOffsetForWeek(focusWeekIndex, viewportWidthRef.current);
    scrollRef.current?.scrollTo({ x: targetX, animated: false });
    hasCenteredRef.current = true;
  }, [focusWeekIndex]);

  useEffect(() => {
    hasCenteredRef.current = false;
    const timeouts = [16, 100, 250].map((delay) => setTimeout(centerOnFocus, delay));
    return () => timeouts.forEach(clearTimeout);
  }, [centerOnFocus, selectedYear]);

  function selectYear(year: number) {
    setSelectedYear(year);
    setPickerOpen(false);
  }

  const canPickYear = availableYears.length > 1;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => canPickYear && setPickerOpen(true)}
          disabled={!canPickYear}
          style={styles.yearButton}
          accessibilityRole="button"
          accessibilityLabel={t('heatmap.selectedYear', { year: selectedYear })}>
          <Text style={styles.title}>{selectedYear}</Text>
          {canPickYear ? (
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          ) : null}
        </Pressable>
        <Text style={styles.muted}>
          {selectedYear === currentYear
            ? t('heatmap.todayCentered')
            : t('heatmap.browsing', { year: selectedYear })}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        key={`year-${selectedYear}`}
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialOffset, y: 0 }}
        onLayout={(event) => {
          viewportWidthRef.current = event.nativeEvent.layout.width;
          if (!hasCenteredRef.current) {
            centerOnFocus();
          }
        }}
        onContentSizeChange={() => {
          if (!hasCenteredRef.current) {
            centerOnFocus();
          }
        }}
        contentContainerStyle={styles.gridContent}>
        <View>
          <View style={styles.monthRow}>
            <View style={styles.dayLabelColumn} />
            {weeks.map((week, weekIndex) => {
              const firstOfMonth = week.find(
                (date) => date.getDate() === 1 && date.getFullYear() === selectedYear,
              );
              return (
                <Text key={`month-${weekIndex}`} style={styles.monthLabel} numberOfLines={1}>
                  {firstOfMonth ? monthLabel(firstOfMonth, localeTag) : ' '}
                </Text>
              );
            })}
          </View>

          <View style={styles.gridRow}>
            <View style={styles.dayLabelColumn}>
              {dayLabels.map((label, index) => (
                <Text key={`dow-${index}`} style={styles.dayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.weekColumn}>
                {week.map((date) => {
                  const key = toDateKey(date);
                  const future = isFutureDate(date);
                  const outsideYear = date.getFullYear() !== selectedYear;
                  const ratio = ratios.get(key) ?? 0;
                  return (
                    <HeatmapCell
                      key={key}
                      date={date}
                      color={getHeatmapColor(ratio, heatAccent, colors.emptyCell)}
                      selected={selectedDate === key}
                      future={future}
                      today={isToday(date)}
                      dimmed={outsideYear}
                      localeTag={localeTag}
                      onPress={onSelectDate ? () => onSelectDate(key) : undefined}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.legendRow}>
        <Text style={styles.muted}>{t('heatmap.less')}</Text>
        <View style={styles.legendSwatches}>
          {legendColors.map((color) => (
            <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />
          ))}
        </View>
        <Text style={styles.muted}>{t('heatmap.more')}</Text>
        <Ionicons name="git-commit-outline" size={14} color={colors.textMuted} />
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.pickerTitle}>{t('heatmap.selectYear')}</Text>
            <ScrollView style={styles.pickerList}>
              {availableYears.map((year) => {
                const active = year === selectedYear;
                return (
                  <Pressable
                    key={year}
                    onPress={() => selectYear(year)}
                    style={[styles.pickerRow, active && styles.pickerRowActive]}>
                    <Text style={[styles.pickerRowText, active && styles.pickerRowTextActive]}>
                      {year}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function HeatmapDaySummary({
  dateKey,
  habits,
  logs,
}: {
  dateKey: string;
  habits: Habit[];
  logs: HabitLog[];
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const logIndex = useMemo(() => indexLogs(logs), [logs]);
  const { completed, total } = getCompletedHabitCount(dateKey, habits, logIndex);
  const ratio = total === 0 ? 0 : completed / total;

  return (
    <Text style={styles.summary}>
      {t('heatmap.summary', {
        completed,
        total,
        percent: Math.round(ratio * 100),
      })}
    </Text>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.lg,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      gap: Spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    yearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    muted: {
      color: colors.textMuted,
      fontSize: 11,
      flexShrink: 1,
      textAlign: 'right',
    },
    gridContent: {
      paddingRight: Spacing.sm,
    },
    monthRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    monthLabel: {
      width: WEEK_SIZE,
      height: MONTH_ROW_HEIGHT,
      color: colors.textMuted,
      fontSize: 10,
    },
    gridRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    dayLabelColumn: {
      width: DAY_LABEL_WIDTH,
      marginRight: DAY_LABEL_GAP,
    },
    dayLabel: {
      height: CELL_SIZE,
      marginBottom: CELL_GAP,
      color: colors.textMuted,
      fontSize: 10,
      lineHeight: CELL_SIZE,
      fontWeight: '600',
    },
    weekColumn: {
      width: WEEK_SIZE,
    },
    cell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: 4,
      marginBottom: CELL_GAP,
    },
    todayCell: {
      borderWidth: 1.5,
      borderColor: colors.todayRing,
    },
    selectedCell: {
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      paddingHorizontal: Spacing.xs,
    },
    legendSwatches: {
      flexDirection: 'row',
      gap: CELL_GAP,
    },
    legendCell: {
      width: 12,
      height: 12,
      borderRadius: 2,
    },
    summary: {
      color: colors.textMuted,
      fontSize: 13,
    },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
    },
    pickerSheet: {
      backgroundColor: colors.surface,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: Spacing.md,
      maxHeight: '60%',
    },
    pickerTitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    pickerList: {
      paddingHorizontal: Spacing.sm,
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
      borderRadius: Radii.md,
    },
    pickerRowActive: {
      backgroundColor: colors.accentDim,
    },
    pickerRowText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '600',
    },
    pickerRowTextActive: {
      color: colors.accent,
    },
  });
}
