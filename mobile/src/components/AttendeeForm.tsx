import { StyleSheet, Text, View } from 'react-native';
import { AppInput } from './AppInput';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { AttendeeInput } from '@/types/order';

export type AttendeeField = keyof AttendeeInput;

interface AttendeeFormProps {
  /** 1-based position shown to the user. */
  index: number;
  ticketTypeName: string;
  value: AttendeeInput;
  errors?: Partial<Record<AttendeeField, string>>;
  onChange: (field: AttendeeField, value: string) => void;
}

/**
 * Collects the details of one attendee. Shown once per ticket when an order
 * covers more than one, so each ticket is issued to a named person rather than
 * all of them to the buyer.
 */
export function AttendeeForm({ index, ticketTypeName, value, errors, onChange }: AttendeeFormProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index}</Text>
        </View>
        <Text style={styles.title}>Ticket {index} · {ticketTypeName}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <AppInput
            label="First name"
            value={value.firstName}
            onChangeText={(text) => onChange('firstName', text)}
            error={errors?.firstName}
            placeholder="Jane"
            autoCapitalize="words"
          />
        </View>
        <View style={styles.rowItem}>
          <AppInput
            label="Last name"
            value={value.lastName}
            onChangeText={(text) => onChange('lastName', text)}
            error={errors?.lastName}
            placeholder="Wanjiru"
            autoCapitalize="words"
          />
        </View>
      </View>

      <AppInput
        label="National ID number"
        value={value.nationalId}
        onChangeText={(text) => onChange('nationalId', text)}
        error={errors?.nationalId}
        placeholder="12345678"
        keyboardType="number-pad"
        autoCapitalize="none"
      />
      <AppInput
        label="Email address"
        value={value.email}
        onChangeText={(text) => onChange('email', text)}
        error={errors?.email}
        placeholder="jane@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <AppInput
        label="Phone number"
        value={value.phone}
        onChangeText={(text) => onChange('phone', text)}
        error={errors?.phone}
        placeholder="07XX XXX XXX"
        keyboardType="phone-pad"
        autoComplete="tel"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '800' },
  title: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  row: { flexDirection: 'row', gap: Spacing.md },
  rowItem: { flex: 1 },
});
