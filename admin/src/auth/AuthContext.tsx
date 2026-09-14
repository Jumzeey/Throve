import type { AdminRole } from '../lib/roles';
import { apiFetch, API_URL } from '../lib/api';
import { ROLE_LABELS } from '../lib/roles';
import {
  clearStaffSession,
  readStoredStaff,
  readTokens,
  writeStoredStaff,
  writeTokens,
} from '../lib/session';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type StaffSession = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  accessToken: string;
};

type AuthContextValue = {
  session: StaffSession | null;
  loading: boolean;
  /** True when the admin can call the Node API (always, unless misconfigured). */
  apiReady: boolean;
  signInWithPassword: (input: { email: string; password: string }) => Promise<void>;
  signInDemo: (input: { email: string; name: string; role: AdminRole }) => void;
  signOut: () => Promise<void>;
};

type StaffLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number | null;
  user: {
    userId: string;
    email: string;
    name: string;
    adminRole: AdminRole;
  };
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(user: StaffLoginResponse['user'], accessToken: string): StaffSession {
  return {
    userId: user.userId,
    email: user.email,
    name: user.name || user.email,
    role: user.adminRole,
    accessToken,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokens = readTokens();
    const staff = readStoredStaff();
    if (tokens?.accessToken && staff?.role) {
      setSession({
        ...staff,
        accessToken: tokens.accessToken,
      });
    }
    setLoading(false);
  }, []);

  const signInWithPassword = useCallback(async (input: { email: string; password: string }) => {
    clearStaffSession();
    const data = await apiFetch<StaffLoginResponse>('/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      }),
    });
    writeTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    });
    writeStoredStaff({
      userId: data.user.userId,
      email: data.user.email,
      name: data.user.name || data.user.email,
      role: data.user.adminRole,
    });
    setSession(toSession(data.user, data.accessToken));
  }, []);

  const signInDemo = useCallback((input: { email: string; name: string; role: AdminRole }) => {
    clearStaffSession();
    setSession({
      userId: 'demo',
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      accessToken: '',
    });
  }, []);

  const signOut = useCallback(async () => {
    clearStaffSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      apiReady: Boolean(API_URL),
      signInWithPassword,
      signInDemo,
      signOut,
    }),
    [session, loading, signInWithPassword, signInDemo, signOut],
  );

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
