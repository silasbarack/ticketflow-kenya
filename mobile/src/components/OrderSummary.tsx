import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { BUYER_PAYS_SERVICE_FEE, calculateOrderTotals, formatCurrency } from '@/utils/currency';

export interface OrderSummaryLine {
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
}

interface OrderSummaryProps {
  lines: OrderSummaryLine[];
}

export function OrderSummary({ lines }: OrderSummaryProps) {
  const grossAmount = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const totals = calculateOrderTotals(grossAmount);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Order summary</Text>

      {lines.map((line) => (
        <View key={line.ticketTypeName} style={styles.row}>
          <Text style={styles.lineLabel}>
            {line.quantity} × {line.ticketTypeName}
          </Text>
          <Text style={styles.lineValue}>{formatCurrency(line.unitPrice * line.quantity)}</Text>
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.subLabel}>Ticket subtotal</Text>
        <Text style={styles.subValue}>{formatCurrency(totals.grossAmount)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.subLabel}>{BUYER_PAYS_SERVICE_FEE ? 'Service fee (9%)' : 'TicketFlow commission (9%)'}</Text>
        <Text style={styles.subValue}>
          {BUYER_PAYS_SERVICE_FEE ? '+' : '-'}
          {formatCurrency(totals.platformFee)}
        </Text>
      </View>
      <Text style={styles.note}>
        {BUYER_PAYS_SERVICE_FEE
          ? 'A 9% TicketFlow service fee is added to your ticket subtotal; the organizer receives the full ticket price.'
          : 'TicketFlow Kenya earns a 9% commission from the organizer’s share on every ticket sold — it is not added to what you pay.'}
      </Text>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total payable</Text>
        <Text style={styles.totalValue}>{formatCurrency(totals.totalPayable)}</Text>
      </View>
      <Text style={styles.estimateNote}>Final pricing is confirmed by TicketFlow when your order is created.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  heading: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  lineLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    flexShrink: 1,
  },
  lineValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  subLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  subValue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  note: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  totalLabel: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  estimateNote: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
