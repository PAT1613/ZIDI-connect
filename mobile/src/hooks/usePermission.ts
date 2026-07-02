import { useAuth } from './useAuth';

export function usePermission(allowedRoles?: string | string[] | null) {
  const { hasRole, roleName, isAuthenticated } = useAuth();
  return {
    allowed: hasRole(allowedRoles),
    roleName,
    isAuthenticated,
  };
}
