import { useAuth } from './useAuth';

export function usePermission(allowedRoles) {
  const { hasRole, roleName, isAuthenticated } = useAuth();
  return {
    allowed: hasRole(allowedRoles),
    roleName,
    isAuthenticated,
  };
}
