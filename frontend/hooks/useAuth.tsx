'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';
import { User, UserRole } from '@/types';

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  companyName?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = window.localStorage.getItem('tfk_token');
    const storedUser = window.localStorage.getItem('tfk_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  function persist(accessToken: string, nextUser: User) {
    window.localStorage.setItem('tfk_token', accessToken);
    window.localStorage.setItem('tfk_user', JSON.stringify(nextUser));
    setToken(accessToken);
    setUser(nextUser);
  }

  async function login(email: string, password: string) {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      persist(data.accessToken, data.user);
      return data.user as User;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function register(payload: RegisterPayload) {
    try {
      const { data } = await api.post('/auth/register', payload);
      persist(data.accessToken, data.user);
      return data.user as User;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  function logout() {
    window.localStorage.removeItem('tfk_token');
    window.localStorage.removeItem('tfk_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  }

  async function refreshUser() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      window.localStorage.setItem('tfk_user', JSON.stringify(data));
    } catch {
      // ignore — interceptor handles 401 cleanup
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
