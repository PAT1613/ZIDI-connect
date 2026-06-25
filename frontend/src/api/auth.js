import { api, STORAGE_KEYS, setTokens, clearSession } from './client';

export async function login(email, password) {
  const { data } = await api.post('/auth/login/', { email, password });
  if (data?.access) setTokens({ access: data.access, refresh: data.refresh });
  if (data?.user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
  return data;
}

export async function logout() {
  try {
    await api.post('/auth/logout/');
  } catch {
    // ignore; we wipe local session regardless
  } finally {
    clearSession();
  }
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me/');
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data));
  return data;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function requestPasswordReset(email) {
  const { data } = await api.post('/auth/password-reset/', { email });
  return data;
}
