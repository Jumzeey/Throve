import type { AdminRole } from '../lib/roles';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ROLE_LABELS } from '../lib/roles';

export type StaffSession = {
  email: string;
  name: string;
  role: AdminRole;
};

type AuthContextValue = {
  session: StaffSession | null;
  signIn: (input: { email: string; name: string; role: AdminRole }) => void;
  signOut: () => void;
};

const STORAGE_KEY = 'throve-admin-session';
const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): StaffSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StaffSession;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(() => readSession());

  const signIn = useCallback((input: { email: string; name: string; role: AdminRole }) => {
    const next = { email: input.email.trim().toLowerCase(), name: input.name.trim(), role: input.role };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function roleLabel(role: AdminRole) {
  return ROLE_LABELS[role];
}
