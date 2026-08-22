import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radii, Spacing, type ThemeColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import { useLocale } from '@/context/LocaleProvider';
import { useTheme } from '@/context/ThemeProvider';

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const { signIn, signUp, isConfigured } = useAuth();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setMessage(null);
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedEmail || password.length < 6) {
      setMessage(t('auth.validation'));
      return;
    }

    if (mode === 'signUp' && trimmedName.length < 2) {
      setMessage(t('auth.nameRequired'));
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signIn') {
        const { error } = await signIn(trimmedEmail, password);
        if (error) setMessage(error);
      } else {
        const { error, needsEmailConfirmation } = await signUp(
          trimmedEmail,
          password,
          trimmedName,
        );
        if (error) {
          setMessage(error);
        } else if (needsEmailConfirmation) {
          Alert.alert(t('auth.confirmTitle'), t('auth.confirmBody'));
          setMode('signIn');
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Ionicons name="grid-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brand}>GridHabits</Text>
          <Text style={styles.subtitle}>
            {mode === 'signIn' ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
          </Text>
        </View>

        {!isConfigured ? (
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>{t('auth.supabaseMissingTitle')}</Text>
            <Text style={styles.warningBody}>{t('auth.supabaseMissingBody')}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {mode === 'signUp' ? (
            <>
              <Text style={styles.label}>{t('auth.fullName')}</Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Ada Lovelace"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
              />
            </>
          ) : null}

          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete={mode === 'signIn' ? 'password' : 'new-password'}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {message ? <Text style={styles.error}>{message}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={busy || !isConfigured}
            style={[styles.submit, (busy || !isConfigured) && styles.submitDisabled]}>
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'signIn' ? t('auth.signIn') : t('auth.createAccount')}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMessage(null);
              setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
            }}
            style={styles.switchMode}>
            <Text style={styles.switchText}>
              {mode === 'signIn' ? t('auth.noAccount') : t('auth.hasAccount')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
      gap: Spacing.xl,
    },
    hero: {
      alignItems: 'center',
      gap: Spacing.sm,
    },
    logoMark: {
      width: 56,
      height: 56,
      borderRadius: Radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    brand: {
      color: colors.accent,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    warning: {
      backgroundColor: colors.surface,
      borderColor: colors.danger,
      borderWidth: 1,
      borderRadius: Radii.md,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    warningTitle: {
      color: colors.danger,
      fontWeight: '700',
    },
    warningBody: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    form: {
      gap: Spacing.sm,
    },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: Spacing.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.md,
      color: colors.text,
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
      fontSize: 16,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      marginTop: Spacing.xs,
    },
    submit: {
      marginTop: Spacing.md,
      backgroundColor: colors.accent,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      minHeight: 52,
    },
    submitDisabled: {
      opacity: 0.55,
    },
    submitText: {
      color: colors.onAccent,
      fontWeight: '700',
      fontSize: 16,
    },
    switchMode: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    switchText: {
      color: colors.textMuted,
      fontSize: 14,
    },
  });
}
