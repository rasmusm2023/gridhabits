export type AppLocale = 'en' | 'sv';

export type TranslationKey = keyof typeof import('./en').en;

export type Translations = Record<TranslationKey, string>;
