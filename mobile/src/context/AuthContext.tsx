import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  type AuthUser,
} from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { isBiometricEnabled, promptBiometricUnlock } from '../lib/biometric';
import { registerForPushNotifications, unregisterPushNotifications } from '../lib/push';
import { clearSession, getAccessToken, getStoredUser } from '../lib/storage';

type RoleArg = string | string[] | null | undefined;

export interface AuthContextValue {
  user: AuthUser | null;
  roleName: string | null;
  initializing: boolean;
  isAuthenticated: boolean;
  locked: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowed?: RoleArg) => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractRoleName(user: AuthUser | null): string | null {
  if (!user) return null;
  const role = user.role;
  if (!role) return null;
  if (typeof role === 'string') return role;
  return (role as { name?: string }).name || null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Biometric gate — true means the UI stays blocked behind the prompt.
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const stored = await getStoredUser<AuthUser>();
      if (stored && !cancelled) setUser(stored);

      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) setInitializing(false);
        return;
      }

      // Gate on biometrics BEFORE we validate — if the user fails auth we
      // clear the session; if they cancel we leave them at the lock screen.
      if (stored && (await isBiometricEnabled())) {
        if (!cancelled) setLocked(true);
        const ok = await promptBiometricUnlock();
        if (cancelled) return;
        if (!ok) {
          // Give up: nuke the session so re-login is required.
          await clearSession();
          setUser(null);
          setLocked(false);
          setInitializing(false);
          return;
        }
        setLocked(false);
      }

      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    // Register for push in background — never block login on it.
    registerForPushNotifications().catch(() => undefined);
  }, []);

  const logout = useCallback(async () => {
    // Best-effort unregister BEFORE we drop the JWT (endpoint needs auth).
    await unregisterPushNotifications().catch(() => undefined);
    await apiLogout();
    setUser(null);
  }, []);

  const roleName = extractRoleName(user);

  const hasRole = useCallback(
    (allowed?: RoleArg) => {
      // Django superusers bypass role checks (matches backend convention).
      if (user?.is_superuser) return true;
      if (!roleName) return false;
      if (!allowed) return true;
      const list = Array.isArray(allowed) ? allowed : [allowed];
      if (list.length === 0) return true;
      return list.includes(roleName);
    },
    [roleName, user?.is_superuser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roleName,
      initializing,
      isAuthenticated: !!user,
      locked,
      login,
      logout,
      hasRole,
    }),
    [user, roleName, initializing, locked, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
