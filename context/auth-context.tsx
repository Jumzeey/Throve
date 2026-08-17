import { DEMO_USER, SEED_SELLERS } from '@/data/seed';
import type { UserProfile } from '@/data/types';
import { delay, isValidDob, isValidEmail } from '@/lib/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const USERS_KEY = '@throve/users';
const SESSION_KEY = '@throve/session';

type AuthContextValue = {
  isReady: boolean;
  session: UserProfile | null;
  signup: (input: { email: string; name: string; username: string; dob: string }) => Promise<void>;
  completeVerification: () => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  completeMagicLink: () => Promise<void>;
  requestRecovery: (email: string) => Promise<void>;
  completeSetup: (input: { username: string; bio: string; location: string; photoUri?: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUsers(): Promise<UserProfile[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify([DEMO_USER]));
    return [DEMO_USER];
  }
  const parsed = JSON.parse(raw) as UserProfile[];
  if (!parsed.some((user) => user.email.toLowerCase() === DEMO_USER.email)) {
    const next = [DEMO_USER, ...parsed];
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(next));
    return next;
  }
  return parsed;
}

async function saveUsers(users: UserProfile[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function takenUsernames(users: UserProfile[]) {
  return new Set([...SEED_SELLERS, ...users.map((user) => user.username.toLowerCase())]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedUsers = await loadUsers();
      const sessionId = await AsyncStorage.getItem(SESSION_KEY);
      const current = sessionId ? storedUsers.find((user) => user.userId === sessionId) ?? null : null;
      if (!cancelled) {
        setSession(current);
        setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback(async (user: UserProfile | null) => {
    setSession(user);
    if (user) {
      await AsyncStorage.setItem(SESSION_KEY, user.userId);
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const signup = useCallback(async (input: { email: string; name: string; username: string; dob: string }) => {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const username = input.username.trim();
    const dob = input.dob.trim();

    if (!email || !name || !username || !dob) {
      throw new Error('All fields are required.');
    }
    if (!isValidEmail(email)) {
      throw new Error('Enter a valid email address.');
    }
    if (!isValidDob(dob)) {
      throw new Error('Enter date of birth as DD/MM/YYYY.');
    }

    const latest = await loadUsers();
    if (latest.some((user) => user.email.toLowerCase() === email)) {
      throw new Error('An account with this email already exists.');
    }
    if (takenUsernames(latest).has(username.toLowerCase())) {
      throw new Error('That username is unavailable.');
    }

    await delay(400);
    const user: UserProfile = {
      userId: `u-${Date.now()}`,
      email,
      name,
      username,
      dob,
      bio: '',
      location: '',
      setupComplete: false,
    };
    const next = [...latest, user];
    await saveUsers(next);
    setPendingUserId(user.userId);
  }, []);

  const completeVerification = useCallback(async () => {
    const latest = await loadUsers();
    const user = latest.find((item) => item.userId === pendingUserId);
    if (!user) {
      throw new Error('Verification expired. Please sign up again.');
    }
    await delay(250);
    await persistSession(user);
    setPendingUserId(null);
  }, [pendingUserId, persistSession]);

  const requestMagicLink = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      throw new Error('Enter your email address.');
    }
    if (!isValidEmail(trimmed)) {
      throw new Error('Enter a valid email address.');
    }
    const latest = await loadUsers();
    const user = latest.find((item) => item.email.toLowerCase() === trimmed);
    if (!user) {
      throw new Error('No Throve account was found for this email.');
    }
    await delay(400);
    setPendingUserId(user.userId);
  }, []);

  const completeMagicLink = useCallback(async () => {
    const latest = await loadUsers();
    const user = latest.find((item) => item.userId === pendingUserId);
    if (!user) {
      throw new Error('This magic link is invalid or has expired.');
    }
    await delay(250);
    await persistSession(user);
    setPendingUserId(null);
  }, [pendingUserId, persistSession]);

  const requestRecovery = useCallback(async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      throw new Error('Enter your email address.');
    }
    if (!isValidEmail(trimmed)) {
      throw new Error('Enter a valid email address.');
    }
    await delay(400);
  }, []);

  const completeSetup = useCallback(
    async (input: { username: string; bio: string; location: string; photoUri?: string }) => {
      if (!session) {
        throw new Error('You need to be signed in to finish setup.');
      }
      const username = input.username.trim();
      if (!username) {
        throw new Error('Username is required.');
      }
      const latest = await loadUsers();
      const taken = takenUsernames(latest.filter((user) => user.userId !== session.userId));
      if (taken.has(username.toLowerCase())) {
        throw new Error('That username is unavailable.');
      }
      await delay(400);
      const updated: UserProfile = {
        ...session,
        username,
        bio: input.bio.trim(),
        location: input.location.trim(),
        photoUri: input.photoUri,
        setupComplete: true,
      };
      const next = latest.map((user) => (user.userId === session.userId ? updated : user));
      await saveUsers(next);
      await persistSession(updated);
    },
    [persistSession, session],
  );

  const logout = useCallback(async () => {
    setPendingUserId(null);
    await persistSession(null);
  }, [persistSession]);

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
      logout,
    }),
    [
      completeMagicLink,
      completeSetup,
      completeVerification,
      isReady,
      logout,
      requestMagicLink,
      requestRecovery,
      session,
      signup,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
