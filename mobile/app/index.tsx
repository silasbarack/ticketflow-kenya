import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

/** Anchor route — Stack.Protected in the root layout falls back here on a guard change. */
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');
  return <Redirect href={isAuthenticated ? '/(tabs)/home' : '/(auth)/login'} />;
}
