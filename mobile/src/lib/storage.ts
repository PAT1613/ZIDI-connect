import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

// Web has no SecureStore. Fall back to localStorage for dev previews.
// (Tokens on web are still vulnerable to XSS — production should be native only.)
const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.access);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.refresh);
}

export async function setTokens({ access, refresh }: { access?: string; refresh?: string }) {
  if (access) await setItem(STORAGE_KEYS.access, access);
  if (refresh) await setItem(STORAGE_KEYS.refresh, refresh);
}

export async function getStoredUser<T = unknown>(): Promise<T | null> {
  const raw = await getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: unknown) {
  if (user === null || user === undefined) {
    await deleteItem(STORAGE_KEYS.user);
    return;
  }
  await setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

export async function clearSession() {
  await Promise.all([
    deleteItem(STORAGE_KEYS.access),
    deleteItem(STORAGE_KEYS.refresh),
    deleteItem(STORAGE_KEYS.user),
  ]);
}
