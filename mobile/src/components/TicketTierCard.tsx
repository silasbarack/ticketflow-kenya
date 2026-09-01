import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { MAX_TICKETS_PER_TIER } from '@/constants/config';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { isTierAvailable, TicketType } from '@/types/event';
import { formatCurrency } from '@/utils/currency';

interface TicketTierCardProps {
  tier: TicketType;
  quantity: number;
  onChange: (quantity: number) => void;
}

export function TicketTierCard({ tier, quantity, onChange }: TicketTierCardProps) {
  const available = isTierAvailable(tier);
  const maxSelectable = Math.min(tier.quantityRemaining, MAX_TICKETS_PER_TIER);
  const canIncrease = available && quantity < maxSelectable;
  const canDecrease = quantity > 0;

  let availabilityLabel = `${tier.quantityRemaining} left`;
  if (tier.quantityRemaining <= 0) availabilityLabel = 'Sold out';
  else if (!available) availabilityLabel = 'Not on sale';
  else if (tier.quantityRemaining <= 10) availabilityLabel = `Only ${tier.quantityRemaining} left`;

  return (
    <View style={[styles.card, !available && styles.cardDisabled, quantity > 0 && styles.cardSelected]}>
      <View style={styles.info}>
        <Text style={styles.name}>{tier.name}</Text>
        {!!tier.description && (
          <Text style={styles.description} numberOfLines={2}>
            {tier.description}
          </Text>
        )}
        <Text style={styles.price}>{formatCurrency(tier.price)}</Text>
        <Text style={[styles.availability, tier.quantityRemaining <= 10 && available && styles.availabilityLow]}>
          {availabilityLabel}
        </Text>
      </View>

      <View style={styles.stepper}>
        <Pressable
          onPress={() => canDecrease && onChange(quantity - 1)}
          disabled={!canDecrease}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${tier.name} quantity`}
          style={[styles.stepButton, !canDecrease && styles.stepButtonDisabled]}
        >
          <Feather name="minus" size={16} color={canDecrease ? Colors.text : Colors.disabled} />
        </Pressable>
        <Text style={styles.quantity} accessibilityLiveRegion="polite">
          {quantity}
        </Text>
        <Pressable
          onPress={() => canIncrease && onChange(quantity + 1)}
          disabled={!canIncrease}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${tier.name} quantity`}
          style={[styles.stepButton, !canIncrease && styles.stepButtonDisabled]}
        >
          <Feather name="plus" size={16} color={canIncrease ? Colors.text : Colors.disabled} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF5F5',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  price: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  availability: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  availabilityLow: {
    color: Colors.warning,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    borderColor: Colors.border,
  },
  quantity: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text,
  },
});
