export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Monday-start week: returns the Monday on or before `date`. */
export function startOfWeekMonday(date: Date): Date {
  const day = startOfDay(date);
  const weekday = day.getDay(); // 0=Sun … 6=Sat
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(day, offset);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isFutureDate(date: Date, now = new Date()): boolean {
  return startOfDay(date).getTime() > startOfDay(now).getTime();
}

export function isToday(date: Date, now = new Date()): boolean {
  return toDateKey(date) === toDateKey(now);
}

export function formatLongDate(date: Date, localeTag?: string): string {
  return date.toLocaleDateString(localeTag, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(date: Date, localeTag?: string): string {
  return date.toLocaleDateString(localeTag, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function monthLabel(date: Date, localeTag?: string): string {
  return date.toLocaleDateString(localeTag, { month: 'short' });
}
