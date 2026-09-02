import { apiFetch, API_URL, ApiError } from '@/lib/api';
import { completeAuthFromRedirectUrl } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/data/types';
import { isValidDob, isValidEmail } from '@/lib/validation';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const DEACTIVATED_ERROR = 'This account has been deactivated.';

type ProfilePatch = {
  name: string;
  username: string;
  bio: string;
  location: string;
  photoUri?: string;
};

type SettingsPatch = {
  notifOffers?: boolean;
  notifMessages?: boolean;
};

type PendingSignup = {
  email: string;
  name: string;
  username: string;
  dob: string;
};

type AuthContextValue = {
  isReady: boolean;
  session: UserProfile | null;
  signup: (input: { email: string; name: string; username: string; dob: string }) => Promise<void>;
  completeVerification: (input?: PendingSignup) => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  completeMagicLink: (email?: string) => Promise<void>;
  requestRecovery: (email: string) => Promise<void>;
  completeSetup: (input: { username: string; bio: string; location: string; photoUri?: string }) => Promise<void>;
  updateProfile: (input: ProfilePatch) => Promise<void>;
  updateSettings: (input: SettingsPatch) => Promise<void>;
  deactivateAccount: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(): Promise<UserProfile | null> {
  try {
    return await apiFetch<UserProfile>('/profiles/me');
  } catch (err) {
    if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
      throw err;
    }
    if (err instanceof Error && /network|failed|fetch/i.test(err.message)) {
      throw new Error('Cannot reach the Throve backend. Start it with npm run start:backend.');
    }
    return null;
  }
}

async function postAuthJson(path: string, body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the Throve backend. Start it with npm run start:backend.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? 'Request failed.');
  }
  return payload;
}

/** Auth emails are sent by the backend via Mailjet — not Supabase SMTP. */
async function requestAuthEmail(input: {
  email: string;
  type: 'magiclink' | 'signup' | 'recovery';
  name?: string;
  username?: string;
  dob?: string;
}) {
  await postAuthJson('/auth/send-link', input);
}

async function simulateDevLink(input: { email: string; name?: string; username?: string; dob?: string }) {
  const payload = (await postAuthJson('/auth/dev/simulate-link', input)) as {
    access_token: string;
    refresh_token: string;
  };

  const { error } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (error) throw new Error(error.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);

  const hydrateProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setSession(null);
      return null;
    }
    const profile = await fetchProfile();
    if (profile?.deactivated) {
      await supabase.auth.signOut();
      setSession(null);
      throw new Error(DEACTIVATED_ERROR);
    }
    if (!profile) {
      setSession(null);
      throw new Error('Could not load your profile. Try again in a moment.');
    }
    setSession(profile);
    return profile;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await hydrateProfile();
      } catch {
        setSession(null);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession) {
        setSession(null);
        return;
      }
      void hydrateProfile().catch(() => {
        setSession(null);
      });
    });

    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      if (!url.includes('auth/callback')) return;
      void completeAuthFromRedirectUrl(url)
        .then(() => hydrateProfile())
        .catch(() => setSession(null));
    });

    void Linking.getInitialURL()
      .then(async (url) => {
        if (!url?.includes('auth/callback')) return;
        await completeAuthFromRedirectUrl(url);
        await hydrateProfile();
      })
      .catch(() => setSession(null));

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, [hydrateProfile]);

  const signup = useCallback(async (input: { email: string; name: string; username: string; dob: string }) => {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const username = input.username.trim();
    const dob = input.dob.trim();

    if (!email || !name || !username || !dob) throw new Error('All fields are required.');
    if (!isValidEmail(email)) throw new Error('Enter a valid email address.');
    if (!isValidDob(dob)) throw new Error('Select a valid date of birth.');

    await requestAuthEmail({ email, type: 'signup', name, username, dob });
    setPendingSignup({ email, name, username, dob });
    setPendingEmail(email);
  }, []);

  const completeVerification = useCallback(async (input?: PendingSignup) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await hydrateProfile();
      setPendingEmail(null);
      setPendingSignup(null);
      return;
    }

    const pending = input ?? pendingSignup;
    if (__DEV__ && pending) {
      await simulateDevLink(pending);
      await hydrateProfile();
      setPendingEmail(null);
      setPendingSignup(null);
      return;
    }

    throw new Error('Verification expired. Please sign up again.');
  }, [hydrateProfile, pendingSignup]);

  const requestMagicLink = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new Error('Enter your email address.');
    if (!isValidEmail(trimmed)) throw new Error('Enter a valid email address.');

    await requestAuthEmail({ email: trimmed, type: 'magiclink' });
    setPendingEmail(trimmed);
  }, []);

  const completeMagicLink = useCallback(async (email?: string) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await hydrateProfile();
      setPendingEmail(null);
      return;
    }

    const targetEmail = email?.trim().toLowerCase() ?? pendingEmail;
    if (__DEV__ && targetEmail) {
      await simulateDevLink({ email: targetEmail });
      await hydrateProfile();
      setPendingEmail(null);
      return;
    }

    throw new Error('This magic link is invalid or has expired.');
  }, [hydrateProfile, pendingEmail]);

  const requestRecovery = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new Error('Enter your email address.');
    if (!isValidEmail(trimmed)) throw new Error('Enter a valid email address.');

    await requestAuthEmail({ email: trimmed, type: 'recovery' });
  }, []);

  const completeSetup = useCallback(
    async (input: { username: string; bio: string; location: string; photoUri?: string }) => {
      const username = input.username.trim();
      if (!username) throw new Error('Username is required.');

      const profile = await apiFetch<UserProfile>('/profiles/me/setup', {
        method: 'POST',
        body: JSON.stringify({
          username,
          bio: input.bio.trim(),
          location: input.location.trim(),
          photoUri: input.photoUri,
        }),
      });
      setSession(profile);
    },
    [],
  );

  const updateProfile = useCallback(async (input: ProfilePatch) => {
    const name = input.name.trim();
    const username = input.username.trim();
    if (!name || !username) throw new Error('Name and username are required.');

    const profile = await apiFetch<UserProfile>('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        name,
        username,
        bio: input.bio.trim(),
        location: input.location.trim(),
        photoUri: input.photoUri,
      }),
    });
    setSession(profile);
  }, []);

  const updateSettings = useCallback(async (input: SettingsPatch) => {
    const profile = await apiFetch<UserProfile>('/profiles/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    setSession(profile);
  }, []);

  const deactivateAccount = useCallback(async () => {
    await apiFetch('/profiles/me/deactivate', { method: 'POST' });
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPendingEmail(null);
    setPendingSignup(null);
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      session,
      signup,
      completeVerification,
      requestMagicLink,
      completeMagicLink,
      requestRecovery,
      completeSetup,
      updateProfile,
      updateSettings,
      deactivateAccount,
      logout,
    }),
    [
      completeMagicLink,
      completeSetup,
      completeVerification,
      deactivateAccount,
      isReady,
      logout,
      requestMagicLink,
      requestRecovery,
      session,
      signup,
      updateProfile,
      updateSettings,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
