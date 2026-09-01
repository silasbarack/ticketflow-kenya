import { create } from 'zustand';
import { authService } from '@/services/auth.service';
import { registerSessionExpiredHandler } from '@/services/api';
import { TokenStorage } from '@/services/secure-storage';
import { AuthSession, LoginInput, RegisterInput, User } from '@/types/auth';

type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  restore: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

async function persistSession(session: AuthSession) {
  await TokenStorage.setTokens(session.tokens.accessToken, session.tokens.refreshToken);
  await TokenStorage.setUserJson(JSON.stringify(session.user));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'restoring',
  user: null,

  async restore() {
    const token = await TokenStorage.getAccessToken();
    if (!token) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    try {
      const user = await authService.me();
      set({ status: 'authenticated', user });
    } catch {
      await TokenStorage.clear();
      set({ status: 'unauthenticated', user: null });
    }
  },

  async login(input) {
    const session = await authService.login(input);
    await persistSession(session);
    set({ status: 'authenticated', user: session.user });
  },

  async register(input) {
    const session = await authService.register(input);
    await persistSession(session);
    set({ status: 'authenticated', user: session.user });
  },

  async logout() {
    await TokenStorage.clear();
    set({ status: 'unauthenticated', user: null });
  },

  async refreshCurrentUser() {
    if (get().status !== 'authenticated') return;
    const user = await authService.me();
    set({ user });
  },
}));

/** Wired once at module load so `api.ts` can end a dead session without importing this store back. */
registerSessionExpiredHandler(() => {
  useAuthStore.setState({ status: 'unauthenticated', user: null });
});
