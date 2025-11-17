import type { UserProfile } from '../types/auth';
import type { PriceLevel } from '../types/pricing';
import { readEnv } from '../utils/env';

type Listener = () => void;

const PRICE_LEVEL_BY_EMAIL: Record<string, PriceLevel> = {
  'smallbar@beer.ru': 'basic',
  'bigbar@beer.ru': 'level1',
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolvePriceLevel(email: string): PriceLevel | null {
  return PRICE_LEVEL_BY_EMAIL[normalizeEmail(email)] ?? null;
}

function hasCredentials() {
  return (
    Boolean(readEnv('VITE_MOYSKLAD_LOGIN')) &&
    Boolean(readEnv('VITE_MOYSKLAD_PASSWORD'))
  );
}

interface AuthState {
  user: UserProfile | null;
}

class AuthModel {
  private state: AuthState = { user: null };

  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  setUser = (user: UserProfile) => {
    this.state = { user };
    this.emit();
  };

  clearUser = () => {
    if (!this.state.user) return;
    this.state = { user: null };
    this.emit();
  };

  hasCredentials = () => hasCredentials();

  resolvePriceLevel = resolvePriceLevel;

  isEmailAllowed = (email: string) => Boolean(resolvePriceLevel(email));

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

export const authModel = new AuthModel();
