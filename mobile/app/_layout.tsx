import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Colors } from '@/constants/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (status !== 'restoring') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {status === 'restoring' ? (
        <LoadingScreen branded message="Loading TicketFlow Kenya…" />
      ) : (
        <RootNavigator isAuthenticated={status === 'authenticated'} />
      )}
    </SafeAreaProvider>
  );
}

function RootNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="events/[eventId]"
          options={{ headerShown: true, title: 'Event Details', headerTintColor: Colors.primary }}
        />
        <Stack.Screen
          name="checkout/[eventId]"
          options={{ headerShown: true, title: 'Checkout', headerTintColor: Colors.primary }}
        />
        <Stack.Screen
          name="payment/[orderId]"
          options={{ headerShown: true, title: 'Payment', headerTintColor: Colors.primary, gestureEnabled: false }}
        />
        <Stack.Screen
          name="ticket/[ticketId]"
          options={{ headerShown: true, title: 'Your Ticket', headerTintColor: Colors.primary }}
        />
        <Stack.Screen
          name="scanner/index"
          options={{ headerShown: true, title: 'Scan Ticket', headerTintColor: Colors.primary }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Legal documents sit outside both guards so they are reachable from the
          sign-up screen as well as from Profile once signed in. */}
      <Stack.Screen
        name="legal/[slug]"
        options={{ headerShown: true, title: 'Legal', headerTintColor: Colors.primary }}
      />

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
