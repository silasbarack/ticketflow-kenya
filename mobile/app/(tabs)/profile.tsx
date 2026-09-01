import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth.store';
import { AppButton } from '@/components/AppButton';
import { LEGAL_DOCUMENTS } from '@/data/legal-policies';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'To permanently delete your account and personal data, please contact support at support@ticketflow.co.ke. We will process your request within a few business days.',
      [{ text: 'OK' }],
    );
  }

  function handleHelp() {
    Linking.openURL('mailto:support@ticketflow.co.ke').catch(() => {
      Alert.alert('Help & Support', 'Email us at support@ticketflow.co.ke');
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(user?.name?.trim()?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.verifiedRow}>
              <Feather
                name={user?.emailVerified ? 'check-circle' : 'alert-circle'}
                size={13}
                color={user?.emailVerified ? Colors.success : Colors.warning}
              />
              <Text style={[styles.verifiedText, { color: user?.emailVerified ? Colors.success : Colors.warning }]}>
                {user?.emailVerified ? 'Email verified' : 'Email not verified'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow icon="phone" label="Phone number" value={user?.phoneNumber ?? '—'} />
        </View>

        {user && user.role !== 'CUSTOMER' && (
          <>
            <Text style={styles.sectionLabel}>Staff tools</Text>
            <View style={styles.menuCard}>
              <MenuRow icon="camera" label="Scan tickets" onPress={() => router.push('/scanner')} last />
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="tag" label="Purchase history" onPress={() => router.push('/(tabs)/tickets')} />
          <View style={styles.menuRow}>
            <View style={styles.menuRowLeft}>
              <Feather name="bell" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuLabel}>Notification settings</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={notificationsEnabled ? Colors.primary : Colors.white}
              accessibilityLabel="Toggle notifications"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="help-circle" label="Help & support" onPress={handleHelp} last />
        </View>

        <Text style={styles.sectionLabel}>Legal</Text>
        <View style={styles.menuCard}>
          {LEGAL_DOCUMENTS.map((doc, index) => (
            <MenuRow
              key={doc.slug}
              icon={doc.icon}
              label={doc.shortTitle}
              onPress={() => router.push(`/legal/${doc.slug}`)}
              last={index === LEGAL_DOCUMENTS.length - 1}
            />
          ))}
        </View>

        <AppButton label="Log out" onPress={handleLogout} variant="outline" style={styles.logoutButton} />
        <Pressable onPress={handleDeleteAccount} accessibilityRole="button" style={styles.deleteRow}>
          <Text style={styles.deleteText}>Request account deletion</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={18} color={Colors.textSecondary} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuRow, !last && styles.menuRowBorder, pressed && styles.pressed]}
    >
      <View style={styles.menuRowLeft}>
        <Feather name={icon} size={18} color={Colors.textSecondary} />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  identityInfo: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  verifiedText: { fontSize: FontSize.xs, fontWeight: '700' },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoText: { flex: 1 },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  infoValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: 2 },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  menuLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  pressed: { opacity: 0.7 },
  logoutButton: { marginTop: Spacing.xl },
  deleteRow: { alignItems: 'center', marginTop: Spacing.lg, padding: Spacing.sm },
  deleteText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.error },
});
