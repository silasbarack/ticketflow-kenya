import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

/** Matches `**bold**` or `[label](policy-slug)`. */
const INLINE_TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

interface LegalTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Renders the light inline markup used by the legal documents: bold runs for
 * defined terms, and cross-references that navigate to another policy in-app
 * rather than opening the website.
 */
export function LegalText({ text, style }: LegalTextProps) {
  return <Text style={style}>{parseInline(text)}</Text>;
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  // `lastIndex` is reset explicitly because the regex is module-level and global.
  INLINE_TOKEN.lastIndex = 0;

  while ((match = INLINE_TOKEN.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const [, boldText, linkLabel, linkSlug] = match;

    if (boldText !== undefined) {
      nodes.push(
        <Text key={`b-${match.index}`} style={styles.bold}>
          {boldText}
        </Text>,
      );
    } else if (linkLabel !== undefined && linkSlug !== undefined) {
      nodes.push(
        <Text
          key={`a-${match.index}`}
          style={styles.link}
          accessibilityRole="link"
          onPress={() => router.push(`/legal/${linkSlug}`)}
        >
          {linkLabel}
        </Text>,
      );
    }

    cursor = INLINE_TOKEN.lastIndex;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700', color: Colors.text },
  link: { color: Colors.primary, fontWeight: '600' },
});
