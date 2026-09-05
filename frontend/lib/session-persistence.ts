import type { UserProfile } from '@/data/types';
import { publicOnlyProfile } from '@/lib/profile-photo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Href } from 'expo-router';

const PROFILE_KEY = 'throve.profile_cache';
const RESUME_KEY = 'throve.auth_resume';

/** Long enough to cover leaving the app to copy an email OTP. */
export const AUTH_RESUME_TTL_MS = 60 * 60 * 1000;

const canUseAsyncStorage = Platform.OS !== 'web' || typeof window !== 'undefined';
const memory = new Map<string, string>();

async function getItem(key: string) {
  if (!canUseAsyncStorage) return memory.get(key) ?? null;
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string) {
  if (!canUseAsyncStorage) {
    memory.set(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function removeItem(key: string) {
  if (!canUseAsyncStorage) {
    memory.delete(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

export type AuthResume =
  | {
      kind: 'set-password';
      email: string;
      purpose: 'setup' | 'change';
      otpSent: true;
      cooldownUntil: number;
      updatedAt: number;
    }
  | {
      kind: 'signup-verify';
      email: string;
      name: string;
      username: string;
      dob: string;
      cooldownUntil: number;
      updatedAt: number;
    }
  | {
      kind: 'login-magic';
      email: string;
      cooldownUntil: number;
      updatedAt: number;
    };

function isFresh(updatedAt: number) {
  return Date.now() - updatedAt < AUTH_RESUME_TTL_MS;
}

export async function loadProfileCache(): Promise<UserProfile | null> {
  try {
    const raw = await getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed?.userId || !parsed.email) return null;
    return publicOnlyProfile(parsed);
  } catch {
    return null;
  }
}

export async function saveProfileCache(profile: UserProfile) {
  await setItem(PROFILE_KEY, JSON.stringify(publicOnlyProfile(profile)));
}

export async function clearProfileCache() {
  await removeItem(PROFILE_KEY);
}

function parseResume(raw: string | null): AuthResume | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthResume;
    if (!parsed?.kind || !parsed.email || !isFresh(parsed.updatedAt)) return null;
    if (parsed.kind === 'set-password' && parsed.otpSent && (parsed.purpose === 'setup' || parsed.purpose === 'change')) {
      return parsed;
    }
    if (parsed.kind === 'signup-verify' && parsed.name && parsed.username && parsed.dob) {
      return parsed;
    }
    if (parsed.kind === 'login-magic') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadAuthResume(): Promise<AuthResume | null> {
  const resume = parseResume(await getItem(RESUME_KEY));
  if (!resume) {
    await removeItem(RESUME_KEY);
    return null;
  }
  return resume;
}

export async function saveAuthResume(resume: AuthResume) {
  await setItem(RESUME_KEY, JSON.stringify(resume));
}

export async function clearAuthResume() {
  await removeItem(RESUME_KEY);
}

export function remainingCooldownSec(cooldownUntil: number) {
  return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
}

export function authResumeHref(resume: AuthResume): Href {
  if (resume.kind === 'set-password') {
    return {
      pathname: '/(auth)/set-password',
      params: { email: resume.email, purpose: resume.purpose },
    };
  }
  if (resume.kind === 'signup-verify') {
    return '/(auth)/signup';
  }
  return '/(auth)/login';
}
