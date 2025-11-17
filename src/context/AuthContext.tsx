import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { authController } from '../controllers/AuthController';
import { authModel } from '../models/AuthModel';
import type { UserProfile } from '../types/auth';

interface AuthContextValue {
  user: UserProfile | null;
  login: (email: string) => boolean;
  logout: () => void;
  hasCredentials: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    authModel.subscribe,
    authModel.getSnapshot
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: snapshot.user,
      login: authController.login,
      logout: authController.logout,
      hasCredentials: authModel.hasCredentials(),
    }),
    [snapshot.user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
