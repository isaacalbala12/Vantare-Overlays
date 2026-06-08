import { useAuthStore } from '../../shared/stores/auth-store';

export function useAccountStatus() {
  const user = useAuthStore((s) => s.user);
  const license = useAuthStore((s) => s.license);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const loadSession = useAuthStore((s) => s.loadSession);
  const logout = useAuthStore((s) => s.logout);

  return {
    user,
    license,
    tier: user?.tier ?? license?.tier ?? 'free',
    isValid: license?.isValid ?? false,
    isLoading,
    error,
    loadSession,
    logout,
  };
}
