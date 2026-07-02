import { api } from './client';
import { clearSession, setStoredUser, setTokens } from '../lib/storage';

export interface UserRole {
  id?: number;
  name: string;
}

export interface AuthUser {
  id: string | number;
  email: string;
  full_name?: string;
  is_superuser?: boolean;
  role?: UserRole | string | null;
  [key: string]: unknown;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login/', { email, password });
  await setTokens({ access: data.access, refresh: data.refresh });
  await setStoredUser(data.user);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout/');
  } catch {
    // ignore — clear session locally regardless
  }
  await clearSession();
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me/');
  await setStoredUser(data);
  return data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/password-reset/', { email });
}
