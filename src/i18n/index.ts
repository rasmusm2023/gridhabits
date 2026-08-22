import { en } from './en';
import { sv } from './sv';
import type { AppLocale, TranslationKey, Translations } from './types';

export type { AppLocale, TranslationKey, Translations };

export const SUPPORTED_LOCALES: AppLocale[] = ['en', 'sv'];

export const LOCALE_TAG: Record<AppLocale, string> = {
  en: 'en-US',
  sv: 'sv-SE',
};

const catalogs: Record<AppLocale, Translations> = {
  en,
  sv,
};

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'sv';
}

export function getDeviceLocale(): AppLocale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en';
    return tag.toLowerCase().startsWith('sv') ? 'sv' : 'en';
  } catch {
    return 'en';
  }
}

export function translate(
  locale: AppLocale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const template = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}
