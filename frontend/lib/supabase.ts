import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

const canUseAsyncStorage = Platform.OS !== 'web' || typeof window !== 'undefined';

const memoryStore = new Map<string, string>();

const storage = {
  getItem: (key: string) => {
    if (!canUseAsyncStorage) return Promise.resolve(memoryStore.get(key) ?? null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (!canUseAsyncStorage) {
      memoryStore.set(key, value);
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (!canUseAsyncStorage) {
      memoryStore.delete(key);
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: canUseAsyncStorage,
    persistSession: canUseAsyncStorage,
    detectSessionInUrl: Platform.OS === 'web' && canUseAsyncStorage,
  },
});

/** Redirect target for magic links — must match Supabase Auth → URL Configuration. */
export function getAuthRedirectUrl() {
  const override = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (override) return override;
  return Linking.createURL('auth/callback');
}
