import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { File, Paths } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { clearSession, getAccessToken, getRefreshToken, setTokens } from '../lib/storage';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.194:8000/api/v1';

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const refresh = await getRefreshToken();
  if (!refresh) throw new Error('no refresh token');

  refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh/`, { refresh })
    .then(async (res) => {
      const access = res.data?.access as string | undefined;
      if (!access) throw new Error('no access in refresh response');
      await setTokens({ access });
      return access;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (!original || original._retried || status !== 401) {
      return Promise.reject(error);
    }

    const url = original.url || '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      const access = await refreshAccessToken();
      original.headers = { ...(original.headers as any), Authorization: `Bearer ${access}` };
      return api(original);
    } catch (refreshErr) {
      await clearSession();
      onUnauthorized?.();
      return Promise.reject(refreshErr);
    }
  },
);

export function extractError(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as AxiosError<any>;
  const data = e?.response?.data;
  if (!data) return e?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = (data as any)[firstKey];
    if (Array.isArray(value)) return `${firstKey}: ${value[0]}`;
    if (typeof value === 'string') return `${firstKey}: ${value}`;
  }
  return fallback;
}

/**
 * Download a report blob to the cache dir and return the local file URI.
 * Caller should then pass the URI to expo-sharing's Sharing.shareAsync().
 */
export async function downloadToCache(
  path: string,
  filename: string,
  params?: Record<string, string | number | undefined>,
): Promise<string> {
  const qs = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}${qs}`;
  const token = await getAccessToken();

  const res = await expoFetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.write(await res.bytes());
  return file.uri;
}
