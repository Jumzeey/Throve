import Constants from 'expo-constants';
import { supabase } from './supabase';

function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const fromExtra = String(Constants.expoConfig?.extra?.apiUrl ?? '').trim();
  const url = fromEnv || fromExtra || 'https://throve-production.up.railway.app';
  return url.replace(/\/$/, '');
}

const API_URL = resolveApiUrl();
const NETWORK_RETRY_DELAY_MS = 1500;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (init.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if (init.signal?.aborted) throw err;
    if (controller.signal.aborted) {
      throw new ApiError('Request timed out. Check your connection and try again.', 'TIMEOUT');
    }
    throw new ApiError(unreachableBackendMessage(), 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const token = await getAccessToken();
  const { timeoutMs = 45_000, ...requestInit } = init;
  const headers = new Headers();
  new Headers(requestInit.headers).forEach((value, key) => headers.set(key, value));
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = `${API_URL}${path}`;
  let response: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetchWithTimeout(url, { ...requestInit, headers }, timeoutMs);
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
      const isNetwork = err instanceof ApiError && err.code === 'NETWORK_ERROR';
      if (!isNetwork || attempt === 1) throw err;
      await sleep(NETWORK_RETRY_DELAY_MS);
    }
  }

  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new ApiError(unreachableBackendMessage(), 'NETWORK_ERROR');
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Request failed', payload.code ?? 'API_ERROR', response.status);
  }

  return payload as T;
}

export async function apiUpload<T>(path: string, formData: FormData, opts?: { timeoutMs?: number }): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const url = `${API_URL}${path}`;
  let response: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: formData,
        },
        timeoutMs,
      );
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError && err.code === 'TIMEOUT') {
        throw new ApiError(
          'Photo upload timed out. Use a stronger connection or fewer / smaller photos, then try again.',
          'TIMEOUT',
        );
      }
      const isNetwork = err instanceof ApiError && err.code === 'NETWORK_ERROR';
      if (!isNetwork || attempt === 1) throw err;
      await sleep(NETWORK_RETRY_DELAY_MS);
    }
  }

  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new ApiError(unreachableBackendMessage(), 'NETWORK_ERROR');
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Upload failed', payload.code ?? 'API_ERROR', response.status);
  }

  return payload as T;
}

export { API_URL };
