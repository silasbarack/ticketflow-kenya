import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { LoginInput, RegisterInput } from '@/types/auth';
import { normalizeError } from '@/utils/errors';

type SubmitResult = { ok: true } | { ok: false; message: string };

/**
 * Thin wrapper around the auth store that adds a shared submitting/error
 * pattern for the login/register/forgot-password screens, so they don't
 * each re-implement try/catch/normalizeError boilerplate.
 */
export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const storeLogin = useAuthStore((s) => s.login);
  const storeRegister = useAuthStore((s) => s.register);
  const storeLogout = useAuthStore((s) => s.logout);
  const refreshCurrentUser = useAuthStore((s) => s.refreshCurrentUser);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(action: () => Promise<void>): Promise<SubmitResult> {
    setIsSubmitting(true);
    try {
      await action();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: normalizeError(error).message };
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    status,
    user,
    isAuthenticated: status === 'authenticated',
    isRestoring: status === 'restoring',
    isSubmitting,
    login: (input: LoginInput) => submit(() => storeLogin(input)),
    register: (input: RegisterInput) => submit(() => storeRegister(input)),
    logout: storeLogout,
    refreshCurrentUser,
  };
}
