import { apiFetch, API_URL, ApiError, isTransientApiError, unreachableBackendMessage } from '@/lib/api';
import { completeAuthFromRedirectUrl } from '@/lib/auth-redirect';
import { setDeviceLoginPreference } from '@/lib/login-preference';
import { validatePassword } from '@/lib/password';
import { isPublicPhotoUri, publicOnlyProfile, uploadProfilePhoto } from '@/lib/profile-photo';
import {
  clearAuthResume,
  clearProfileCache,
  loadAuthResume,
  loadProfileCache,
  saveAuthResume,
  saveProfileCache,
  type AuthResume,
} from '@/lib/session-persistence';
import { supabase } from '@/lib/supabase';
import type { PreferredLoginMethod, PublicProfile, UserProfile } from '@/data/types';
import { isValidDob, isValidEmail } from '@/lib/validation';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const DEACTIVATED_ERROR = 'This account has been deactivated.';

type ProfilePatch = {
  name: string;
  username: string;
  bio: string;
  location: string;
  photoUri?: string;
  phone?: string;
};

type SettingsPatch = {
  notifOffers?: boolean;
  notifMessages?: boolean;
  preferredLoginMethod?: PreferredLoginMethod;
};

type PendingSignup = {
  email: string;
  name: string;
  username: string;
  dob: string;
};

type LoginOptions = {
  exists: boolean;
  hasPassword: boolean;
  preferredLoginMethod: PreferredLoginMethod;
};

type PasswordOtpPurpose = 'setup' | 'change' | 'signup';

type AuthContextValue = {
  isReady: boolean;
  /** True while a magic-link / deep-link sign-in is in progress. */
  isAuthenticatingLink: boolean;
  session: UserProfile | null;
  /** Public seller cards keyed by username, seeded from the signed-in profile. */
  publicProfiles: Record<string, PublicProfile>;
  ensurePublicProfile: (username: string) => Promise<PublicProfile>;
  /** In-progress email OTP / magic-link flow restored after the OS kills the app. */
  authResume: AuthResume | null;
  persistAuthResume: (resume: AuthResume) => Promise<void>;
  clearAuthResumeFlow: () => Promise<void>;
  signup: (input: {
    email: string;
    name: string;
    username: string;
    dob: string;
    password: string;
    phone: string;
  }) => Promise<void>;
  verifySignupOtp: (input: { email: string; otp: string }) => Promise<void>;
  completeVerification: (input?: PendingSignup) => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  completeMagicLink: (email?: string) => Promise<void>;
  requestRecovery: (email: string) => Promise<void>;
  getLoginOptions: (email: string) => Promise<LoginOptions>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  sendPasswordOtp: (email: string, purpose?: PasswordOtpPurpose) => Promise<void>;
  setPasswordWithOtp: (input: {
    email: string;
    otp: string;
    password: string;
    purpose?: PasswordOtpPurpose;
  }) => Promise<void>;
  updatePreferredLoginMethod: (method: PreferredLoginMethod) => Promise<void>;
  finishAuthFromUrl: (url: string) => Promise<UserProfile | null>;
  completeSetup: (input: { username: string; bio: string; location: string; photoUri?: string }) => Promise<void>;
  /** Uploads a picked file and stores the public URL on the profile. */
  setProfilePhoto: (localUri: string) => Promise<string>;
  updateProfile: (input: ProfilePatch) => Promise<void>;
  updateSettings: (input: SettingsPatch) => Promise<void>;
  deactivateAccount: () => Promise<void>;
  logout: () => Promise<void>;
};

function toPublicProfile(profile: Pick<UserProfile, 'username' | 'bio' | 'location' | 'photoUri'>): PublicProfile {
  return {
    username: profile.username,
    bio: profile.bio,
    location: profile.location,
    photoUri: profile.photoUri,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(): Promise<UserProfile | null> {
  try {
    return await apiFetch<UserProfile>('/profiles/me');
  } catch (err) {
    if (isTransientApiError(err)) {
      throw err;
    }
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

async function postAuthJson(path: string, body: Record<string, unknown>, authed = false) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authed) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(unreachableBackendMessage());
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
  const [isAuthenticatingLink, setIsAuthenticatingLink] = useState(false);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [publicProfiles, setPublicProfiles] = useState<Record<string, PublicProfile>>({});
  const [authResume, setAuthResume] = useState<AuthResume | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const deepLinkInflight = useRef<{ url: string; promise: Promise<UserProfile | null> } | null>(null);
  const sessionRef = useRef<UserProfile | null>(null);
  const hydratedUserId = useRef<string | null>(null);
  const hydrateInflight = useRef<Promise<UserProfile | null> | null>(null);
  const publicProfilesRef = useRef<Record<string, PublicProfile>>({});
  const publicProfileInflight = useRef<Partial<Record<string, Promise<PublicProfile>>>>({});

  const rememberPublicProfile = useCallback((profile: PublicProfile) => {
    const existing = publicProfilesRef.current[profile.username];
    if (
      existing &&
      existing.bio === profile.bio &&
      existing.location === profile.location &&
      existing.photoUri === profile.photoUri
    ) {
      return;
    }
    publicProfilesRef.current = { ...publicProfilesRef.current, [profile.username]: profile };
    setPublicProfiles(publicProfilesRef.current);
  }, []);

  const applySession = useCallback(async (profile: UserProfile | null) => {
    const next = profile ? publicOnlyProfile(profile) : null;
    sessionRef.current = next;
    setSession(next);
    if (next) {
      hydratedUserId.current = next.userId;
      rememberPublicProfile(toPublicProfile(next));
      await saveProfileCache(next);
    } else {
      hydratedUserId.current = null;
      publicProfilesRef.current = {};
      setPublicProfiles({});
      await clearProfileCache();
    }
  }, [rememberPublicProfile]);

  const persistAuthResume = useCallback(async (resume: AuthResume) => {
    await saveAuthResume(resume);
    setAuthResume(resume);
  }, []);

  const clearAuthResumeFlow = useCallback(async () => {
    await clearAuthResume();
    setAuthResume(null);
  }, []);

  const hydrateProfile = useCallback(async (options?: { force?: boolean }) => {
    if (hydrateInflight.current) return hydrateInflight.current;

    const work = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await applySession(null);
        return null;
      }

      const userId = data.session.user.id;
      if (!sessionRef.current) {
        const cached = await loadProfileCache();
        if (cached && cached.userId === userId) {
          sessionRef.current = cached;
          hydratedUserId.current = cached.userId;
          setSession(cached);
          rememberPublicProfile(toPublicProfile(cached));
        }
      }

      if (!options?.force && hydratedUserId.current === userId && sessionRef.current) {
        return sessionRef.current;
      }

      try {
        const profile = await fetchProfile();
        if (profile?.deactivated) {
          await supabase.auth.signOut();
          await applySession(null);
          await clearAuthResumeFlow();
          throw new Error(DEACTIVATED_ERROR);
        }
        if (!profile) {
          await supabase.auth.signOut();
          await applySession(null);
          return null;
        }
        await applySession(profile);
        await clearAuthResumeFlow();
        return sessionRef.current;
      } catch (err) {
        if (isTransientApiError(err)) {
          if (sessionRef.current) return sessionRef.current;
          const cachedAfter = await loadProfileCache();
          if (cachedAfter && cachedAfter.userId === userId) {
            sessionRef.current = cachedAfter;
            hydratedUserId.current = cachedAfter.userId;
            setSession(cachedAfter);
            rememberPublicProfile(toPublicProfile(cachedAfter));
            return cachedAfter;
          }
        }
        throw err;
      }
    })();

    hydrateInflight.current = work;
    try {
      return await work;
    } finally {
      if (hydrateInflight.current === work) hydrateInflight.current = null;
    }
  }, [applySession, clearAuthResumeFlow, rememberPublicProfile]);

  const ensurePublicProfile = useCallback(
    async (username: string) => {
      const me = sessionRef.current;
      if (me?.username === username) {
        const card = toPublicProfile(me);
        rememberPublicProfile(card);
        return card;
      }
      const cached = publicProfilesRef.current[username];
      if (cached) return cached;
      const inflight = publicProfileInflight.current[username];
      if (inflight) return inflight;

      const work = (async () => {
        const profile = await apiFetch<PublicProfile>(`/profiles/${encodeURIComponent(username)}/public`);
        const card: PublicProfile = {
          username,
          bio: profile.bio ?? '',
          location: profile.location ?? '',
          photoUri: profile.photoUri,
        };
        rememberPublicProfile(card);
        return card;
      })().finally(() => {
        delete publicProfileInflight.current[username];
      });
      publicProfileInflight.current[username] = work;
      return work;
    },
    [rememberPublicProfile],
  );

  const finishAuthFromUrl = useCallback(
    async (url: string) => {
      if (deepLinkInflight.current?.url === url) {
        return deepLinkInflight.current.promise;
      }

      setIsAuthenticatingLink(true);
      const promise = (async () => {
        try {
          await completeAuthFromRedirectUrl(url);
          return await hydrateProfile({ force: true });
        } finally {
          setIsAuthenticatingLink(false);
        }
      })();
      deepLinkInflight.current = { url, promise };

      try {
        return await promise;
      } catch (err) {
        if (deepLinkInflight.current?.url === url) {
          deepLinkInflight.current = null;
        }
        throw err;
      }
    },
    [hydrateProfile],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const resume = await loadAuthResume();
      if (cancelled) return;
      setAuthResume(resume);
      if (resume?.kind === 'signup-verify') {
        setPendingSignup({
          email: resume.email,
          name: resume.name,
          username: resume.username,
          dob: resume.dob,
        });
        setPendingEmail(resume.email);
      } else if (resume?.kind === 'set-password' || resume?.kind === 'login-magic') {
        setPendingEmail(resume.email);
      }

      try {
        const initialUrl = await Linking.getInitialURL();
        if (cancelled) return;
        if (initialUrl?.includes('auth/callback')) {
          await finishAuthFromUrl(initialUrl);
        } else {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            const cached = await loadProfileCache();
            if (!cancelled && cached?.userId === data.session.user.id) {
              sessionRef.current = cached;
              hydratedUserId.current = cached.userId;
              setSession(cached);
              rememberPublicProfile(toPublicProfile(cached));
              setIsReady(true);
            }
          }
          if (sessionRef.current) {
            void hydrateProfile({ force: true }).catch(() => undefined);
          } else {
            await hydrateProfile({ force: true });
          }
        }
      } catch {
        if (!cancelled && !sessionRef.current) {
          const cached = await loadProfileCache();
          if (cached) {
            sessionRef.current = cached;
            setSession(cached);
          }
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === 'SIGNED_OUT' || !authSession) {
        if (event === 'SIGNED_OUT') {
          void applySession(null);
          publicProfilesRef.current = {};
          setPublicProfiles({});
        }
        return;
      }
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        return;
      }
      const sameUser = hydratedUserId.current === authSession.user.id && sessionRef.current;
      void hydrateProfile({ force: event === 'SIGNED_IN' && !sameUser }).catch(() => {
        // Keep a cached / in-memory session if the API is briefly unreachable.
      });
    });

    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      if (!url.includes('auth/callback')) return;
      void finishAuthFromUrl(url).catch(() => undefined);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, [hydrateProfile, finishAuthFromUrl, applySession, rememberPublicProfile]);

  const signup = useCallback(
    async (input: {
      email: string;
      name: string;
      username: string;
      dob: string;
      password: string;
      phone: string;
    }) => {
      const email = input.email.trim().toLowerCase();
      const name = input.name.trim();
      const username = input.username.trim();
      const dob = input.dob.trim();
      const password = input.password;
      const phone = input.phone.trim();

      if (!email || !name || !username || !dob || !password || !phone) throw new Error('All fields are required.');
      if (!isValidEmail(email)) throw new Error('Enter a valid email address.');
      if (!isValidDob(dob)) throw new Error('Select a valid date of birth.');
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);

      await postAuthJson('/auth/signup', { email, password, name, username, dob, phone });
      setPendingSignup({ email, name, username, dob });
      setPendingEmail(email);
    },
    [],
  );

  const verifySignupOtp = useCallback(
    async (input: { email: string; otp: string }) => {
      const email = input.email.trim().toLowerCase();
      const otp = input.otp.trim();
      if (!email || !otp) throw new Error('Enter the verification code from your email.');

      const payload = (await postAuthJson('/auth/signup/verify-otp', { email, otp })) as {
        access_token: string;
        refresh_token: string;
      };

      const { error } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      if (error) throw new Error(error.message);

      await hydrateProfile({ force: true });
      setPendingEmail(null);
      setPendingSignup(null);
      await setDeviceLoginPreference('password');
    },
    [hydrateProfile],
  );

  const completeVerification = useCallback(
    async (input?: PendingSignup) => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await hydrateProfile({ force: true });
        setPendingEmail(null);
        setPendingSignup(null);
        return;
      }

      const pending = input ?? pendingSignup;
      if (__DEV__ && pending) {
        await simulateDevLink(pending);
        await hydrateProfile({ force: true });
        setPendingEmail(null);
        setPendingSignup(null);
        return;
      }

      throw new Error('Verification expired. Please sign up again.');
    },
    [hydrateProfile, pendingSignup],
  );

  const requestMagicLink = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new Error('Enter your email address.');
    if (!isValidEmail(trimmed)) throw new Error('Enter a valid email address.');

    await requestAuthEmail({ email: trimmed, type: 'magiclink' });
    setPendingEmail(trimmed);
  }, []);

  const completeMagicLink = useCallback(
    async (email?: string) => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await hydrateProfile({ force: true });
        setPendingEmail(null);
        return;
      }

      const targetEmail = email?.trim().toLowerCase() ?? pendingEmail;
      if (__DEV__ && targetEmail) {
        await simulateDevLink({ email: targetEmail });
        await hydrateProfile({ force: true });
        setPendingEmail(null);
        return;
      }

      throw new Error('This magic link is invalid or has expired.');
    },
    [hydrateProfile, pendingEmail],
  );

  const requestRecovery = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new Error('Enter your email address.');
    if (!isValidEmail(trimmed)) throw new Error('Enter a valid email address.');

    await requestAuthEmail({ email: trimmed, type: 'recovery' });
  }, []);

  const getLoginOptions = useCallback(async (email: string): Promise<LoginOptions> => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !isValidEmail(trimmed)) throw new Error('Enter a valid email address.');
    return (await postAuthJson('/auth/login-options', { email: trimmed })) as LoginOptions;
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) throw new Error('Enter your email address.');
      if (!isValidEmail(trimmed)) throw new Error('Enter a valid email address.');
      if (!password) throw new Error('Enter your password.');

      const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (error) throw new Error(error.message);

      await hydrateProfile({ force: true });
      setPendingEmail(null);
    },
    [hydrateProfile],
  );

  const sendPasswordOtp = useCallback(async (email: string, purpose: PasswordOtpPurpose = 'setup') => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new Error('Enter your email address.');
    if (!isValidEmail(trimmed)) throw new Error('Enter a valid email address.');

    await postAuthJson('/auth/password/send-otp', { email: trimmed, purpose }, purpose === 'change');
    setPendingEmail(trimmed);
  }, []);

  const setPasswordWithOtp = useCallback(
    async (input: { email: string; otp: string; password: string; purpose?: PasswordOtpPurpose }) => {
      const email = input.email.trim().toLowerCase();
      const otp = input.otp.trim();
      const password = input.password;
      const purpose = input.purpose ?? 'setup';

      if (!email || !otp) throw new Error('Enter the verification code from your email.');
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);

      const payload = (await postAuthJson(
        '/auth/password/set',
        { email, otp, password, purpose },
        purpose === 'change',
      )) as {
        access_token: string | null;
        refresh_token: string | null;
      };

      if (payload.access_token && payload.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });
        if (error) {
          // Tokens from the API can race with password rotation — fall back to password login.
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw new Error(signInError.message);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error(signInError.message);
      }

      await hydrateProfile({ force: true });
      setPendingEmail(null);
      if (purpose === 'setup' || purpose === 'signup') {
        await setDeviceLoginPreference('password');
      }
    },
    [hydrateProfile],
  );

  const updatePreferredLoginMethod = useCallback(async (method: PreferredLoginMethod) => {
    // Persist to server + this device so login UI matches next cold start.
    const profile = await apiFetch<UserProfile>('/profiles/me/settings', {
      method: 'PATCH',
      body: JSON.stringify({ preferredLoginMethod: method }),
    });
    await setDeviceLoginPreference(method);
    await applySession(profile);
  }, [applySession]);

  const completeSetup = useCallback(
    async (input: { username: string; bio: string; location: string; photoUri?: string }) => {
      const username = input.username.trim();
      if (!username) throw new Error('Username is required.');

      const photoUri = isPublicPhotoUri(input.photoUri) ? input.photoUri : undefined;
      const profile = await apiFetch<UserProfile>('/profiles/me/setup', {
        method: 'POST',
        body: JSON.stringify({
          username,
          bio: input.bio.trim(),
          location: input.location.trim(),
          photoUri,
        }),
      });
      await applySession(profile);
    },
    [applySession],
  );

  const setProfilePhoto = useCallback(
    async (localUri: string) => {
      const url = await uploadProfilePhoto(localUri);
      const current = sessionRef.current;
      if (current) await applySession({ ...current, photoUri: url });
      return url;
    },
    [applySession],
  );

  const updateProfile = useCallback(async (input: ProfilePatch) => {
    const name = input.name.trim();
    const username = input.username.trim();
    if (!name || !username) throw new Error('Name and username are required.');

    const photoUri = isPublicPhotoUri(input.photoUri) ? input.photoUri : undefined;
    const profile = await apiFetch<UserProfile>('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        name,
        username,
        bio: input.bio.trim(),
        location: input.location.trim(),
        photoUri,
        phone: input.phone?.trim() || undefined,
        dob: sessionRef.current?.dob || undefined,
      }),
    });
    await applySession(profile);
  }, [applySession]);

  const updateSettings = useCallback(async (input: SettingsPatch) => {
    const profile = await apiFetch<UserProfile>('/profiles/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    await applySession(profile);
  }, [applySession]);

  const deactivateAccount = useCallback(async () => {
    await apiFetch('/profiles/me/deactivate', { method: 'POST' });
    await supabase.auth.signOut();
    await applySession(null);
    await clearAuthResumeFlow();
  }, [applySession, clearAuthResumeFlow]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    await applySession(null);
    await clearAuthResumeFlow();
    setPendingEmail(null);
    setPendingSignup(null);
  }, [applySession, clearAuthResumeFlow]);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticatingLink,
      session,
      publicProfiles,
      ensurePublicProfile,
      authResume,
      persistAuthResume,
      clearAuthResumeFlow,
      signup,
      verifySignupOtp,
      completeVerification,
      requestMagicLink,
      completeMagicLink,
      requestRecovery,
      getLoginOptions,
      signInWithPassword,
      sendPasswordOtp,
      setPasswordWithOtp,
      updatePreferredLoginMethod,
      finishAuthFromUrl,
      completeSetup,
      setProfilePhoto,
      updateProfile,
      updateSettings,
      deactivateAccount,
      logout,
    }),
    [
      completeMagicLink,
      completeSetup,
      completeVerification,
      clearAuthResumeFlow,
      deactivateAccount,
      ensurePublicProfile,
      finishAuthFromUrl,
      getLoginOptions,
      isAuthenticatingLink,
      isReady,
      logout,
      persistAuthResume,
      publicProfiles,
      requestMagicLink,
      requestRecovery,
      sendPasswordOtp,
      session,
      authResume,
      setPasswordWithOtp,
      setProfilePhoto,
      signInWithPassword,
      signup,
      updatePreferredLoginMethod,
      updateProfile,
      updateSettings,
      verifySignupOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
