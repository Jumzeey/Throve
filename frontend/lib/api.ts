import Constants from 'expo-constants';
import { supabase } from './supabase';

function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const fromExtra = String(Constants.expoConfig?.extra?.apiUrl ?? '').trim();
  const url = fromEnv || fromExtra || 'https://throve-production.up.railway.app';
  return url.replace(/\/$/, '');
}

const API_URL = resolveApiUrl();

export function unreachableBackendMessage() {
  const isLocal = /localhost|127\.0\.0\.1/.test(API_URL);
  if (isLocal) {
    return `Cannot reach the Throve backend at ${API_URL}. Start it with npm run start:backend.`;
  }
  return `Cannot reach the Throve backend at ${API_URL}.`;
}

export class ApiError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code = 'API_ERROR', status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function isTransientApiError(err: unknown) {
  if (!(err instanceof ApiError)) {
    return err instanceof Error && /network|failed|fetch/i.test(err.message);
  }
  if (err.code === 'NETWORK_ERROR') return true;
  if (err.status === 429) return true;
  return typeof err.status === 'number' && err.status >= 500;
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (err) {
    if (init.signal?.aborted) throw err;
    throw new ApiError(unreachableBackendMessage(), 'NETWORK_ERROR');
  }
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Request failed', payload.code ?? 'API_ERROR', response.status);
  }

  return payload as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Upload failed', payload.code ?? 'API_ERROR', response.status);
  }

  return payload as T;
}

export { API_URL };
