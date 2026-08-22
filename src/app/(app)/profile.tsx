import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getFirstName, getFullName, getInitials } from '@/utils/profile';

export default function ProfileScreen() {
  const { user, updateFullName, signOut } = useAuth();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(getFullName(user));
  }, [user]);

  const initials = useMemo(
    () => getInitials(fullName || getFullName(user), user?.email),
    [fullName, user],
  );
  const firstName = getFirstName(fullName || getFullName(user));

  async function handleSave() {
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setMessage(t('profile.enterFullName'));
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await updateFullName(trimmed);
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    Alert.alert(t('profile.savedTitle'), t('profile.savedBody'));
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <Pressable
          onPress={() => router.push('/(app)/settings')}
          style={styles.settingsButton}
          hitSlop={12}
          accessibilityLabel={t('profile.settings')}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.namePreview}>
          {firstName ? t('profile.hi', { name: firstName }) : t('profile.yourProfile')}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>

        <Text style={styles.label}>{t('profile.fullName')}</Text>
        <TextInput
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
          placeholder={t('profile.fullNamePlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {message ? <Text style={styles.error}>{message}</Text> : null}

        <Pressable onPress={handleSave} disabled={busy} style={styles.saveButton}>
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.saveText}>{t('profile.saveChanges')}</Text>
          )}
        </Pressable>

        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </Pressable>
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
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    content: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      alignItems: 'center',
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.accentDim,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    avatarText: {
      color: colors.accent,
      fontSize: 28,
      fontWeight: '800',
    },
    namePreview: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    email: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: 4,
      marginBottom: Spacing.xl,
    },
    label: {
      alignSelf: 'stretch',
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: Spacing.sm,
    },
    input: {
      alignSelf: 'stretch',
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
      alignSelf: 'stretch',
      color: colors.danger,
      marginTop: Spacing.sm,
    },
    saveButton: {
      alignSelf: 'stretch',
      marginTop: Spacing.lg,
      backgroundColor: colors.accent,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      minHeight: 52,
    },
    saveText: {
      color: colors.onAccent,
      fontWeight: '700',
      fontSize: 16,
    },
    signOutButton: {
      marginTop: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
    },
    signOutText: {
      color: colors.danger,
      fontWeight: '600',
      fontSize: 15,
    },
  });
}
