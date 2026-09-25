import { Habit, HabitSection } from '@/types';

export type OutlineItem =
  | { kind: 'section'; id: string }
  | { kind: 'habit'; id: string; sectionId: string | null };

export type HabitGroup = {
  section: HabitSection | null;
  habits: Habit[];
};

function bySortOrder<T extends { sortOrder: number }>(left: T, right: T, tie: (a: T, b: T) => number) {
  return left.sortOrder - right.sortOrder || tie(left, right);
}

export function sortSections(sections: HabitSection[]): HabitSection[] {
  return [...sections].sort((left, right) =>
    bySortOrder(left, right, (a, b) => a.name.localeCompare(b.name)),
  );
}

export function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort((left, right) =>
    bySortOrder(left, right, (a, b) => a.createdAt.localeCompare(b.createdAt)),
  );
}

export function groupHabits(sections: HabitSection[], habits: Habit[]): HabitGroup[] {
  const orderedSections = sortSections(sections);
  const sectionIds = new Set(orderedSections.map((section) => section.id));
  const buckets = new Map<string | null, Habit[]>();

  for (const habit of habits) {
    const key = habit.sectionId && sectionIds.has(habit.sectionId) ? habit.sectionId : null;
    const bucket = buckets.get(key) ?? [];
    bucket.push(habit);
    buckets.set(key, bucket);
  }

  const groups: HabitGroup[] = [];
  const ungrouped = sortHabits(buckets.get(null) ?? []);
  if (ungrouped.length > 0) {
    groups.push({ section: null, habits: ungrouped });
  }

  for (const section of orderedSections) {
    groups.push({
      section,
      habits: sortHabits(buckets.get(section.id) ?? []),
    });
  }

  return groups;
}

export function toOutlineItems(sections: HabitSection[], habits: Habit[]): OutlineItem[] {
  const items: OutlineItem[] = [];
  for (const group of groupHabits(sections, habits)) {
    if (group.section) items.push({ kind: 'section', id: group.section.id });
    for (const habit of group.habits) {
      items.push({ kind: 'habit', id: habit.id, sectionId: group.section?.id ?? null });
    }
  }
  return items;
}

export function moveOutlineItem(items: OutlineItem[], from: number, to: number): OutlineItem[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const moving = items[from];
  if (!moving) return items;

  if (moving.kind === 'habit') {
    const next = items.filter((_, index) => index !== from);
    const insertAt = to > from ? to - 1 : to;
    next.splice(Math.max(0, Math.min(insertAt, next.length)), 0, moving);
    return next;
  }

  let end = from + 1;
  while (end < items.length) {
    const next = items[end];
    if (!next || next.kind !== 'habit' || next.sectionId !== moving.id) break;
    end += 1;
  }
  if (to > from && to < end) return items;

  const block = items.slice(from, end);
  const rest = [...items.slice(0, from), ...items.slice(end)];
  const insertAt = to > from ? Math.max(0, to - block.length) : to;
  rest.splice(Math.max(0, Math.min(insertAt, rest.length)), 0, ...block);
  return rest;
}

/** Place `from` so it lands at `insertAt` in the resulting list. Sections take their following habits with them. */
export function placeOutlineItem(items: OutlineItem[], from: number, insertAt: number): OutlineItem[] {
  if (from < 0 || from >= items.length) return items;
  const moving = items[from];
  if (!moving) return items;

  if (moving.kind === 'section') {
    let end = from + 1;
    while (end < items.length) {
      const next = items[end];
      if (!next || next.kind !== 'habit' || next.sectionId !== moving.id) break;
      end += 1;
    }
    if (insertAt > from && insertAt < end) return items;
    const block = items.slice(from, end);
    const rest = [...items.slice(0, from), ...items.slice(end)];
    const index = Math.max(0, Math.min(insertAt > from ? insertAt - block.length : insertAt, rest.length));
    rest.splice(index, 0, ...block);
    return rest;
  }

  const rest = items.filter((_, index) => index !== from);
  const adjusted = insertAt > from ? insertAt - 1 : insertAt;
  const index = Math.max(0, Math.min(adjusted, rest.length));
  rest.splice(index, 0, moving);
  return rest;
}

export function groupPair(
  items: OutlineItem[],
  dragId: string,
  targetId: string,
  sectionId: string,
): OutlineItem[] {
  const targetIndex = items.findIndex((item) => item.kind === 'habit' && item.id === targetId);
  const rest = items.filter(
    (item) => !(item.kind === 'habit' && (item.id === dragId || item.id === targetId)),
  );
  const removedBefore = items
    .slice(0, Math.max(targetIndex, 0))
    .filter((item) => item.kind === 'habit' && (item.id === dragId || item.id === targetId)).length;
  const at = Math.max(0, targetIndex - removedBefore);
  const block: OutlineItem[] = [
    { kind: 'section', id: sectionId },
    { kind: 'habit', id: targetId, sectionId },
    { kind: 'habit', id: dragId, sectionId },
  ];
  rest.splice(at, 0, ...block);
  return rest;
}

export function placeHabit(
  items: OutlineItem[],
  from: number,
  insertAt: number,
  sectionId: string | null,
): OutlineItem[] {
  const moving = items[from];
  if (!moving || moving.kind !== 'habit') return items;
  const rest = items.filter((_, index) => index !== from);
  const adjusted = insertAt > from ? insertAt - 1 : insertAt;
  const index = Math.max(0, Math.min(adjusted, rest.length));
  const next: OutlineItem = { ...moving, sectionId };
  if (adjusted === from && moving.sectionId === sectionId) return items;
  rest.splice(index, 0, next);
  return rest;
}

/** Keep habits that are hidden today attached to the routine they already belong to. */
export function applyVisibleOrder(full: OutlineItem[], visible: OutlineItem[]): OutlineItem[] {
  const visibleKeys = new Set(visible.map((item) => `${item.kind}:${item.id}`));
  const hiddenBySection = new Map<string | null, OutlineItem[]>();

  for (const item of full) {
    if (item.kind !== 'habit' || visibleKeys.has(`habit:${item.id}`)) continue;
    const hidden = hiddenBySection.get(item.sectionId) ?? [];
    hidden.push(item);
    hiddenBySection.set(item.sectionId, hidden);
  }

  const merged: OutlineItem[] = [];
  let current: string | null = null;
  for (const item of visible) {
    if (item.kind === 'section') {
      merged.push(...(hiddenBySection.get(current) ?? []));
      current = item.id;
    }
    merged.push(item);
  }
  merged.push(...(hiddenBySection.get(current) ?? []));
  return merged;
}

export function materializeOutline(
  items: OutlineItem[],
  sections: HabitSection[],
  habits: Habit[],
): { sections: HabitSection[]; habits: Habit[] } {
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  const nextSections: HabitSection[] = [];
  const nextHabits: Habit[] = [];
  const seenHabits = new Set<string>();
  let sectionOrder = 0;
  const habitCounts = new Map<string | null, number>();

  for (const item of items) {
    if (item.kind === 'section') {
      const section = sectionById.get(item.id);
      if (!section) continue;
      nextSections.push({ ...section, sortOrder: sectionOrder });
      sectionOrder += 1;
      continue;
    }

    const habit = habitById.get(item.id);
    if (!habit) continue;
    const sectionId = item.sectionId;
    const sortOrder = habitCounts.get(sectionId) ?? 0;
    habitCounts.set(sectionId, sortOrder + 1);
    seenHabits.add(habit.id);
    nextHabits.push({ ...habit, sectionId, sortOrder });
  }

  for (const habit of habits) {
    if (!seenHabits.has(habit.id)) nextHabits.push(habit);
  }

  return { sections: nextSections, habits: nextHabits };
}
