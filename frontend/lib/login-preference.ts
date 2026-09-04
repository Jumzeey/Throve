import type { PreferredLoginMethod } from '@/data/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'throve.preferred_login_method';

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

/** Empty / missing → password (app default). */
export async function getDeviceLoginPreference(): Promise<PreferredLoginMethod> {
  const value = await getItem(KEY);
  if (value === 'magic_link') return 'magic_link';
  return 'password';
}

export async function setDeviceLoginPreference(method: PreferredLoginMethod) {
  await setItem(KEY, method);
}

export async function clearDeviceLoginPreference() {
  await removeItem(KEY);
}
