import type { TranslationKey } from '@/i18n';

const GREETINGS_WITH_NAME: TranslationKey[] = [
  'greeting.helloName',
  'greeting.heyName',
  'greeting.welcomeBackName',
  'greeting.goodToSeeName',
  'greeting.letsGoName',
];

const GREETINGS_TIME: { beforeHour: number; key: TranslationKey }[] = [
  { beforeHour: 12, key: 'greeting.morning' },
  { beforeHour: 18, key: 'greeting.afternoon' },
  { beforeHour: 24, key: 'greeting.evening' },
];

const GREETINGS_GENERIC: TranslationKey[] = [
  'greeting.helloThere',
  'greeting.welcomeBack',
  'greeting.ready',
];

export function getFullName(user: { user_metadata?: Record<string, unknown> } | null | undefined): string {
  const meta = user?.user_metadata ?? {};
  const raw =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    '';
  return raw.trim();
}

export function getFirstName(fullName: string): string | null {
  const first = fullName.trim().split(/\s+/)[0];
  return first ? first : null;
}

export function getInitials(fullName: string, email?: string | null): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0]) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '?';
}

/** Stable-ish greeting for the day so it doesn’t flicker on re-render. */
export function getGreetingKey(firstName: string | null, now = new Date()): TranslationKey {
  if (!firstName) {
    return GREETINGS_GENERIC[now.getDate() % GREETINGS_GENERIC.length]!;
  }

  const hour = now.getHours();
  const useTimeBased = now.getDate() % 2 === 0;
  if (useTimeBased) {
    const match = GREETINGS_TIME.find((item) => hour < item.beforeHour) ?? GREETINGS_TIME[2]!;
    return match.key;
  }

  return GREETINGS_WITH_NAME[now.getDate() % GREETINGS_WITH_NAME.length]!;
}
