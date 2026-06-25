import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, logout as apiLogout, getStoredUser, fetchMe } from '../api/auth';
import { getAccessToken } from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const token = getAccessToken();
      if (!token) {
        setInitializing(false);
        return;
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

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const roleName = user?.role?.name || user?.role || null;

  const hasRole = useCallback(
    (allowed) => {
      if (!roleName) return false;
      if (!allowed || allowed.length === 0) return true;
      const list = Array.isArray(allowed) ? allowed : [allowed];
      return list.includes(roleName);
    },
    [roleName],
  );

  const value = useMemo(
    () => ({ user, roleName, login, logout, hasRole, initializing, isAuthenticated: !!user }),
    [user, roleName, login, logout, hasRole, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
