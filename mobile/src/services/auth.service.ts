import { USE_MOCK_DATA } from '@/constants/config';
import { AuthSession, ForgotPasswordInput, LoginInput, RegisterInput, User } from '@/types/auth';
import { normalizeKenyanPhone } from '@/utils/phone';
import { api } from './api';
import { mapUser } from './backend-mappers';
import { delay, mockState, randomId } from './mock-state';

interface AuthService {
  register(input: RegisterInput): Promise<AuthSession>;
  login(input: LoginInput): Promise<AuthSession>;
  forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }>;
  verifyEmail(token: string): Promise<{ message: string }>;
  resendVerification(): Promise<{ message: string }>;
  me(): Promise<User>;
}

/** The API returns `{ accessToken, user }`; there is no refresh token issued. */
function toSession(data: { accessToken: string; user: Record<string, unknown> }): AuthSession {
  return { user: mapUser(data.user), tokens: { accessToken: data.accessToken } };
}

const realAuthService: AuthService = {
  async register(input) {
    // The API splits the name and expects `phone`, so reshape before sending.
    const [firstName, ...rest] = input.name.trim().split(/\s+/);
    const { data } = await api.post<{ accessToken: string; user: Record<string, unknown> }>('/auth/register', {
      firstName,
      lastName: rest.join(' ') || firstName,
      email: input.email,
      phone: normalizeKenyanPhone(input.phoneNumber) ?? input.phoneNumber,
      password: input.password,
    });
    return toSession(data);
  },
  async login(input) {
    const { data } = await api.post<{ accessToken: string; user: Record<string, unknown> }>('/auth/login', {
      email: input.email,
      password: input.password,
    });
    return toSession(data);
  },
  async forgotPassword(input) {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', input);
    return data;
  },
  async verifyEmail() {
    // No email-verification endpoint exists yet; accounts are usable immediately.
    return { message: 'Your account is already active.' };
  },
  async resendVerification() {
    return { message: 'Email verification is not required for TicketFlow accounts yet.' };
  },
  async me() {
    const { data } = await api.get<Record<string, unknown>>('/auth/me');
    return mapUser(data);
  },
};

const NEUTRAL_FORGOT_PASSWORD_MESSAGE = "If an account exists for that email, we've sent password reset instructions.";

function buildMockUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id ?? randomId('user'),
    name: overrides.name ?? 'Demo Customer',
    email: overrides.email ?? 'demo@ticketflow.co.ke',
    phoneNumber: overrides.phoneNumber ?? '254712345678',
    role: 'CUSTOMER',
    emailVerified: overrides.emailVerified ?? true,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

const mockAuthService: AuthService = {
  async register(input) {
    await delay(600);
    const user = buildMockUser({
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      emailVerified: false,
    });
    mockState.currentUser = user;
    return { user, tokens: { accessToken: randomId('mock_access'), refreshToken: randomId('mock_refresh') } };
  },
  async login(input) {
    await delay(500);
    const user = buildMockUser({ email: input.email });
    mockState.currentUser = user;
    return { user, tokens: { accessToken: randomId('mock_access'), refreshToken: randomId('mock_refresh') } };
  },
  async forgotPassword() {
    await delay(500);
    return { message: NEUTRAL_FORGOT_PASSWORD_MESSAGE };
  },
  async verifyEmail() {
    await delay(400);
    if (mockState.currentUser) mockState.currentUser.emailVerified = true;
    return { message: 'Your email has been verified.' };
  },
  async resendVerification() {
    await delay(400);
    return { message: 'Verification email sent. Check your inbox.' };
  },
  async me() {
    await delay(300);
    if (!mockState.currentUser) mockState.currentUser = buildMockUser();
    return mockState.currentUser;
  },
};

export const authService: AuthService = USE_MOCK_DATA ? mockAuthService : realAuthService;
