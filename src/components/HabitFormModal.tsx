import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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

import { Colors, Radii, Spacing } from '@/constants/theme';
import { HABIT_CATEGORIES, HABIT_COLORS, HABIT_ICONS, Habit, HabitDraft } from '@/types';

type HabitFormModalProps = {
  visible: boolean;
  habit?: Habit | null;
  onClose: () => void;
  onSave: (draft: HabitDraft) => void;
  onDelete?: (id: string) => void;
};

export function HabitFormModal({ visible, habit, onClose, onSave, onDelete }: HabitFormModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(HABIT_CATEGORIES[0]);
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [icon, setIcon] = useState<string>(HABIT_ICONS[0]);
  const [targetDailyCount, setTargetDailyCount] = useState(1);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setName(habit?.name ?? '');
    setCategory(habit?.category ?? HABIT_CATEGORIES[0]);
    setColor(habit?.color ?? HABIT_COLORS[0]);
    setIcon(habit?.icon ?? HABIT_ICONS[0]);
    setTargetDailyCount(habit?.targetDailyCount ?? 1);
    setIsActive(habit?.isActive ?? true);
  }, [habit, visible]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Give this habit a short name.');
      return;
    }

    onSave({
      name: trimmed,
      category,
      color,
      icon,
      targetDailyCount,
      isActive,
    });
    onClose();
  }

  function handleDelete() {
    if (!habit || !onDelete) return;
    Alert.alert('Delete habit', `Remove ${habit.name}? Past grid history for it will be cleared.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(habit.id);
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>{habit ? 'Edit habit' : 'New habit'}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Medicine, vitamins, teeth..."
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              autoFocus={!habit}
              maxLength={32}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {HABIT_CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.chip, category === item && styles.chipActive]}>
                  <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Color</Text>
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

            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconRow}>
              {HABIT_ICONS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setIcon(item)}
                  style={[styles.iconButton, icon === item && { borderColor: color }]}>
                  <Ionicons
                    name={item as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={icon === item ? color : Colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Times per day</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setTargetDailyCount((value) => Math.max(1, value - 1))}
                style={styles.stepButton}>
                <Ionicons name="remove" size={18} color={Colors.text} />
              </Pressable>
              <Text style={styles.stepValue}>{targetDailyCount}</Text>
              <Pressable
                onPress={() => setTargetDailyCount((value) => Math.min(12, value + 1))}
                style={styles.stepButton}>
                <Ionicons name="add" size={18} color={Colors.text} />
              </Pressable>
            </View>

            {habit ? (
              <Pressable onPress={() => setIsActive((value) => !value)} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Active on the grid</Text>
                <View style={[styles.toggle, isActive && { backgroundColor: Colors.accent }]}>
                  <View style={[styles.toggleThumb, isActive && styles.toggleThumbOn]} />
                </View>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {habit && onDelete ? (
              <Pressable onPress={handleDelete} style={styles.deleteButton}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveText}>{habit ? 'Save changes' : 'Add habit'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.border,
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
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  form: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radii.md,
    color: Colors.text,
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
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  chipText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  chipTextActive: {
    color: Colors.accent,
    fontWeight: '600',
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
    borderColor: Colors.text,
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
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
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
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  stepValue: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  toggleRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    color: Colors.text,
    fontSize: 15,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.text,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
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
    borderColor: Colors.danger,
    alignItems: 'center',
    paddingVertical: 14,
  },
  deleteText: {
    color: Colors.danger,
    fontWeight: '700',
  },
  saveButton: {
    flex: 2,
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    paddingVertical: 14,
  },
  saveText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});
