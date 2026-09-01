import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import { FontSize, Spacing } from '@/constants/spacing';

interface LoadingScreenProps {
  message?: string;
  /** Shows the TicketFlow Kenya logo — used for full-screen startup/session restore. */
  branded?: boolean;
}

const LOGO = require('../../assets/images/logo.png');

export function LoadingScreen({ message, branded = false }: LoadingScreenProps) {
  return (
    <View
      style={[styles.container, branded && styles.brandedContainer]}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading'}
    >
      {branded && (
        <Image
          source={LOGO}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="TicketFlow Kenya"
        />
      )}
      <ActivityIndicator size="large" color={Colors.primary} />
      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  brandedContainer: {
    backgroundColor: Colors.white,
    gap: Spacing.xl,
  },
  logo: {
    width: 220,
    height: 230,
  },
  message: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
});
