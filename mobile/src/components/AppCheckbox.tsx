import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';

interface AppCheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  label: string;
  error?: string;
}

export function AppCheckbox({ checked, onToggle, label, error }: AppCheckboxProps) {
  return (
    <View>
      <Pressable
        onPress={() => onToggle(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={styles.row}
        hitSlop={4}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked && <Feather name="check" size={14} color={Colors.white} />}
        </View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  label: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  error: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
});
