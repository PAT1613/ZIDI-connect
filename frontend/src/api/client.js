import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const STORAGE_KEYS = {
  access: 'zidi.access',
  refresh: 'zidi.refresh',
  user: 'zidi.user',
};

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refresh);
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(STORAGE_KEYS.access, access);
  if (refresh) localStorage.setItem(STORAGE_KEYS.refresh, refresh);
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh: queue concurrent 401s onto one in-flight refresh promise
// so we don't fire N parallel refresh calls and burn the refresh token.
let refreshPromise = null;

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  const refresh = getRefreshToken();
  if (!refresh) return Promise.reject(new Error('no refresh token'));

  refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh/`, { refresh })
    .then((res) => {
      const { access } = res.data || {};
      if (!access) throw new Error('no access in refresh response');
      setTokens({ access });
      return access;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
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
      original.headers = { ...original.headers, Authorization: `Bearer ${access}` };
      return api(original);
    } catch (refreshErr) {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
      return Promise.reject(refreshErr);
    }
  },
);

export function extractError(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = data[firstKey];
    if (Array.isArray(value)) return `${firstKey}: ${value[0]}`;
    if (typeof value === 'string') return `${firstKey}: ${value}`;
  }
  return fallback;
}

export async function downloadBlob(url, filename, params) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
