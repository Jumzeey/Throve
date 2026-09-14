import type { AdminRole } from '../lib/roles';
import { apiFetch } from '../lib/api';
import { ROLE_LABELS } from '../lib/roles';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
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
  supabaseReady: boolean;
  signInWithPassword: (input: { email: string; password: string }) => Promise<void>;
  /** Prototype fallback when Supabase env is missing. */
  signInDemo: (input: { email: string; name: string; role: AdminRole }) => void;
  signOut: () => Promise<void>;
};

type ProfileMe = {
  userId: string;
  email: string;
  name: string;
  adminRole?: AdminRole | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadStaffSession(): Promise<StaffSession | null> {
  if (!isSupabaseConfigured) return null;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const user = data.session?.user;
  if (!token || !user) return null;

  const profile = await apiFetch<ProfileMe>('/profiles/me');
  if (!profile.adminRole) {
    await supabase.auth.signOut();
    throw new Error('This account is not staff. Ask a Super Admin to grant admin_role.');
  }

  return {
    userId: profile.userId,
    email: profile.email,
    name: profile.name || profile.email,
    role: profile.adminRole,
    accessToken: token,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadStaffSession();
        if (!cancelled) setSession(next);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'TOKEN_REFRESHED') return;
      if (event === 'SIGNED_OUT') {
        setSession(null);
        return;
      }
      void loadStaffSession()
        .then((next) => setSession(next))
        .catch(() => setSession(null));
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (input: { email: string; password: string }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase env vars are not configured on this deploy.');
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    if (error) throw error;
    const next = await loadStaffSession();
    if (!next) throw new Error('Could not load staff profile.');
    setSession(next);
  }, []);

  const signInDemo = useCallback((input: { email: string; name: string; role: AdminRole }) => {
    setSession({
      userId: 'demo',
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      accessToken: '',
    });
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      supabaseReady: isSupabaseConfigured,
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
