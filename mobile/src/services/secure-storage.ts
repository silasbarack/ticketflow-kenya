import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'tfk_access_token',
  refreshToken: 'tfk_refresh_token',
  user: 'tfk_user',
} as const;

export const TokenStorage = {
  async getAccessToken() {
    return SecureStore.getItemAsync(KEYS.accessToken);
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync(KEYS.refreshToken);
  },
  async setTokens(accessToken: string, refreshToken?: string) {
    await SecureStore.setItemAsync(KEYS.accessToken, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(KEYS.refreshToken, refreshToken);
    }
  },
  async getUserJson() {
    return SecureStore.getItemAsync(KEYS.user);
  },
  async setUserJson(json: string) {
    await SecureStore.setItemAsync(KEYS.user, json);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken),
      SecureStore.deleteItemAsync(KEYS.refreshToken),
      SecureStore.deleteItemAsync(KEYS.user),
    ]);
  },
};
