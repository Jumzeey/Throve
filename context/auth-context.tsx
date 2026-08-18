import { DEMO_USER, SEED_SELLERS } from '@/data/seed';
import type { UserProfile } from '@/data/types';
import { delay, isValidDob, isValidEmail } from '@/lib/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const USERS_KEY = '@throve/users';
const SESSION_KEY = '@throve/session';

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

type AuthContextValue = {
  isReady: boolean;
  session: UserProfile | null;
  signup: (input: { email: string; name: string; username: string; dob: string }) => Promise<void>;
  completeVerification: () => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  completeMagicLink: () => Promise<void>;
  requestRecovery: (email: string) => Promise<void>;
  completeSetup: (input: { username: string; bio: string; location: string; photoUri?: string }) => Promise<void>;
  updateProfile: (input: ProfilePatch) => Promise<void>;
  updateSettings: (input: SettingsPatch) => Promise<void>;
  deactivateAccount: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUsers(): Promise<UserProfile[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  let parsed: UserProfile[];
  if (!raw) {
    parsed = [DEMO_USER];
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(parsed));
  } else {
    parsed = JSON.parse(raw) as UserProfile[];
    if (!parsed.some((user) => user.email.toLowerCase() === DEMO_USER.email)) {
      parsed = [DEMO_USER, ...parsed];
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(parsed));
    }
  }
  return parsed.map(normalizeUser);
}

function normalizeUser(user: UserProfile): UserProfile {
  const isDemo = user.email.toLowerCase() === DEMO_USER.email;
  return {
    ...user,
    phone: user.phone ?? (isDemo ? DEMO_USER.phone : undefined),
    notifOffers: user.notifOffers !== false,
    notifMessages: user.notifMessages !== false,
    canHostLive: isDemo,
  };
}

async function saveUsers(users: UserProfile[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function isUsernameTaken(users: UserProfile[], username: string, exceptUserId?: string) {
  const name = username.toLowerCase();
  const except = users.find((user) => user.userId === exceptUserId);
  const exceptName = except?.username.toLowerCase();
  if (exceptName === name) return false;
  if (users.some((user) => user.userId !== exceptUserId && user.username.toLowerCase() === name)) return true;
  return SEED_SELLERS.some((seller) => seller.toLowerCase() === name);
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
        if (current?.deactivated) {
          setSession(null);
          await AsyncStorage.removeItem(SESSION_KEY);
        } else {
          setSession(current);
        }
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

  const persistUser = useCallback(
    async (updated: UserProfile) => {
      const latest = await loadUsers();
      const next = latest.map((user) => (user.userId === updated.userId ? updated : user));
      await saveUsers(next);
      await persistSession(updated);
    },
    [persistSession],
  );

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
    if (isUsernameTaken(latest, username)) {
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
      notifOffers: true,
      notifMessages: true,
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
    if (user.deactivated) {
      throw new Error(DEACTIVATED_ERROR);
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
    if (user.deactivated) {
      throw new Error(DEACTIVATED_ERROR);
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
    if (user.deactivated) {
      throw new Error(DEACTIVATED_ERROR);
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
      if (isUsernameTaken(latest, username, session.userId)) {
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
      await persistUser(updated);
    },
    [persistUser, session],
  );

  const updateProfile = useCallback(
    async (input: ProfilePatch) => {
      if (!session) {
        throw new Error('You need to be signed in to update your profile.');
      }
      const name = input.name.trim();
      const username = input.username.trim();
      if (!name || !username) {
        throw new Error('Name and username are required.');
      }
      const latest = await loadUsers();
      if (isUsernameTaken(latest, username, session.userId)) {
        throw new Error('That username is unavailable.');
      }
      await delay(400);
      const updated: UserProfile = {
        ...session,
        name,
        username,
        bio: input.bio.trim(),
        location: input.location.trim(),
        photoUri: input.photoUri,
      };
      await persistUser(updated);
    },
    [persistUser, session],
  );

  const updateSettings = useCallback(
    async (input: SettingsPatch) => {
      if (!session) {
        throw new Error('You need to be signed in to update settings.');
      }
      const updated: UserProfile = {
        ...session,
        notifOffers: input.notifOffers ?? session.notifOffers !== false,
        notifMessages: input.notifMessages ?? session.notifMessages !== false,
      };
      await persistUser(updated);
    },
    [persistUser, session],
  );

  const deactivateAccount = useCallback(async () => {
    if (!session) {
      throw new Error('You need to be signed in to deactivate your account.');
    }
    const latest = await loadUsers();
    const updated: UserProfile = { ...session, deactivated: true };
    const next = latest.map((user) => (user.userId === session.userId ? updated : user));
    await saveUsers(next);
    setPendingUserId(null);
    await persistSession(null);
  }, [persistSession, session]);

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
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
