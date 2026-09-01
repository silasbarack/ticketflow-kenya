import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, Radius, Spacing } from '@/constants/spacing';
import { LEGAL_DOCUMENTS, getLegalDocument } from '@/data/legal-policies';
import { LegalText } from '@/components/LegalText';
import { ErrorState } from '@/components/ErrorState';
import type { LegalBlock } from '@/types/legal';

export default function LegalDocumentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const doc = getLegalDocument(slug);

  if (!doc) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <Stack.Screen options={{ title: 'Legal' }} />
        <ErrorState
          title="Policy not found"
          message="This document is not available in the app. You can find the latest version on the TicketFlow Kenya website."
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const otherDocs = LEGAL_DOCUMENTS.filter((d) => d.slug !== doc.slug);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen options={{ title: doc.shortTitle }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {doc.status === 'draft' && (
          <View style={styles.draftNotice}>
            <Feather name="alert-circle" size={16} color={Colors.warning} />
            <Text style={styles.draftNoticeText}>
              Draft — this document is under review and is not yet in force.
            </Text>
          </View>
        )}

        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.effectiveDate}>Effective date: {doc.effectiveDate}</Text>

        <View style={styles.article}>
          {doc.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Other policies</Text>
        <View style={styles.menuCard}>
          {otherDocs.map((other, index) => (
            <Pressable
              key={other.slug}
              onPress={() => router.push(`/legal/${other.slug}`)}
              accessibilityRole="button"
              accessibilityLabel={other.title}
              style={({ pressed }) => [
                styles.menuRow,
                index < otherDocs.length - 1 && styles.menuRowBorder,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.menuRowLeft}>
                <Feather name={other.icon} size={18} color={Colors.textSecondary} />
                <Text style={styles.menuLabel}>{other.shortTitle}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.footnote}>
          This document mirrors the version published on the TicketFlow Kenya website.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case 'heading':
      return <LegalText text={block.text} style={styles.heading} />;

    case 'subheading':
      return <LegalText text={block.text} style={styles.subheading} />;

    case 'paragraph':
      return <LegalText text={block.text} style={styles.paragraph} />;

    case 'bullets':
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <LegalText text={item} style={styles.listItemText} />
            </View>
          ))}
        </View>
      );

    case 'steps':
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.stepNumber}>{index + 1}.</Text>
              <LegalText text={item} style={styles.listItemText} />
            </View>
          ))}
        </View>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  draftNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  draftNoticeText: { flex: 1, fontSize: FontSize.xs, fontWeight: '600', color: Colors.warning },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  effectiveDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.xs },
  article: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  heading: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  subheading: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    fontSize: FontSize.sm,
    lineHeight: 21,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  list: { marginBottom: Spacing.sm, gap: Spacing.xs },
  listItem: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.xs },
  bullet: { fontSize: FontSize.sm, lineHeight: 21, color: Colors.primary },
  stepNumber: {
    fontSize: FontSize.sm,
    lineHeight: 21,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 18,
  },
  listItemText: { flex: 1, fontSize: FontSize.sm, lineHeight: 21, color: Colors.textSecondary },
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
  footnote: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
