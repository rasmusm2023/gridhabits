import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { Habit, HabitLog } from '@/types';
import { formatShortDate, isFutureDate, isToday, monthLabel, toDateKey } from '@/utils/dates';
import {
  buildHeatmapWeeks,
  DEFAULT_HEATMAP_COLOR,
  getCompletedHabitCount,
  getDayCompletionRatio,
  getHeatmapColor,
  indexLogs,
} from '@/utils/heatmap';

const CELL_SIZE = 13;
const CELL_GAP = 3;
const WEEK_SIZE = CELL_SIZE + CELL_GAP;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

type HabitHeatmapProps = {
  habits: Habit[];
  logs: HabitLog[];
  selectedDate: string;
  onSelectDate?: (dateKey: string) => void;
  accentColor?: string;
};

type CellProps = {
  date: Date;
  color: string;
  selected: boolean;
  future: boolean;
  today: boolean;
  onPress?: () => void;
};

const HeatmapCell = memo(function HeatmapCell({
  date,
  color,
  selected,
  future,
  today,
  onPress,
}: CellProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatShortDate(date)}
      disabled={future || !onPress}
      onPress={onPress}
      style={[
        styles.cell,
        { backgroundColor: color, opacity: future ? 0.35 : 1 },
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
  onSelectDate,
  accentColor = DEFAULT_HEATMAP_COLOR,
}: HabitHeatmapProps) {
  const scrollRef = useRef<ScrollView>(null);
  const weeks = useMemo(() => buildHeatmapWeeks(), []);
  const logIndex = useMemo(() => indexLogs(logs), [logs]);

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
    getHeatmapColor(ratio, accentColor),
  );

  function handleContentSizeChange(width: number) {
    scrollRef.current?.scrollTo({ x: Math.max(width, 0), animated: false });
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4" style={styles.card}>
      <View style={styles.headerRow}>
        <Text className="text-base font-semibold text-[#e6edf3]" style={styles.title}>
          Last 52 weeks
        </Text>
        <Text className="text-xs text-[#8b949e]" style={styles.muted}>
          Tap a day to inspect it
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={(width) => handleContentSizeChange(width)}
        contentContainerStyle={styles.gridContent}>
        <View>
          <View style={styles.monthRow}>
            <View style={styles.dayLabelColumn} />
            {weeks.map((week, weekIndex) => {
              const firstOfMonth = week.find((date) => date.getDate() === 1);
              return (
                <Text key={`month-${weekIndex}`} style={styles.monthLabel} numberOfLines={1}>
                  {firstOfMonth ? monthLabel(firstOfMonth) : ''}
                </Text>
              );
            })}
          </View>

          <View style={styles.gridRow}>
            <View style={styles.dayLabelColumn}>
              {DAY_LABELS.map((label, index) => (
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
                  const ratio = ratios.get(key) ?? 0;
                  return (
                    <HeatmapCell
                      key={key}
                      date={date}
                      color={getHeatmapColor(ratio, accentColor)}
                      selected={selectedDate === key}
                      future={future}
                      today={isToday(date)}
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
        <Text style={styles.muted}>Less</Text>
        <View style={styles.legendSwatches}>
          {legendColors.map((color) => (
            <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />
          ))}
        </View>
        <Text style={styles.muted}>More</Text>
        <Ionicons name="git-commit-outline" size={14} color={Colors.textMuted} />
      </View>
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
  const logIndex = useMemo(() => indexLogs(logs), [logs]);
  const { completed, total } = getCompletedHabitCount(dateKey, habits, logIndex);
  const ratio = total === 0 ? 0 : completed / total;

  return (
    <Text style={styles.summary}>
      {completed}/{total} habits · {Math.round(ratio * 100)}%
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  muted: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  gridContent: {
    paddingRight: Spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthLabel: {
    width: WEEK_SIZE,
    color: Colors.textMuted,
    fontSize: 10,
  },
  gridRow: {
    flexDirection: 'row',
  },
  dayLabelColumn: {
    width: 28,
    marginRight: 4,
    gap: CELL_GAP,
  },
  dayLabel: {
    height: CELL_SIZE,
    color: Colors.textMuted,
    fontSize: 10,
    lineHeight: CELL_SIZE,
  },
  weekColumn: {
    width: WEEK_SIZE,
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  todayCell: {
    borderWidth: 1,
    borderColor: Colors.todayRing,
  },
  selectedCell: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  legendSwatches: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  summary: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
