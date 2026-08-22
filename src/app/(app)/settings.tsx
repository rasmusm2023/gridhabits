import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radii, Spacing, type ColorScheme, type ThemeColors } from '@/constants/theme';
import { useLocale } from '@/context/LocaleProvider';
import { useTheme } from '@/context/ThemeProvider';
import type { AppLocale } from '@/i18n';

const LANGUAGE_OPTIONS: { locale: AppLocale; labelKey: 'settings.english' | 'settings.swedish' }[] =
  [
    { locale: 'en', labelKey: 'settings.english' },
    { locale: 'sv', labelKey: 'settings.swedish' },
  ];

const APPEARANCE_OPTIONS: {
  scheme: ColorScheme;
  labelKey: 'settings.dark' | 'settings.light';
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { scheme: 'dark', labelKey: 'settings.dark', icon: 'moon' },
  { scheme: 'light', labelKey: 'settings.light', icon: 'sunny' },
];

export default function SettingsScreen() {
  const { locale, setLocale, t } = useLocale();
  const { colorScheme, setColorScheme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
        <Text style={styles.sectionHint}>{t('settings.appearanceHint')}</Text>

        <View style={styles.options}>
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = colorScheme === option.scheme;
            return (
              <Pressable
                key={option.scheme}
                onPress={() => {
                  void setColorScheme(option.scheme);
                }}
                style={[styles.option, selected && styles.optionSelected]}>
                <View style={styles.optionLeft}>
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={selected ? colors.accent : colors.textMuted}
                  />
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {t(option.labelKey)}
                  </Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                ) : (
                  <View style={styles.radio} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, styles.sectionSpaced]}>{t('settings.language')}</Text>
        <Text style={styles.sectionHint}>{t('settings.languageHint')}</Text>

        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = locale === option.locale;
            return (
              <Pressable
                key={option.locale}
                onPress={() => {
                  void setLocale(option.locale);
                }}
                style={[styles.option, selected && styles.optionSelected]}>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {t(option.labelKey)}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                ) : (
                  <View style={styles.radio} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    headerSpacer: {
      width: 40,
    },
    content: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    sectionSpaced: {
      marginTop: Spacing.xl,
    },
    sectionHint: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 6,
      marginBottom: Spacing.lg,
      lineHeight: 18,
    },
    options: {
      gap: Spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 16,
    },
    optionSelected: {
      borderColor: colors.accent,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    optionText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    optionTextSelected: {
      color: colors.accent,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
  });
}
