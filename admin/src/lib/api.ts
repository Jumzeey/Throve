import { supabase } from './supabase';

declare const __THROVE_API_URL__: string;

const API_URL = (
  typeof __THROVE_API_URL__ !== 'undefined' && __THROVE_API_URL__
    ? __THROVE_API_URL__
    : 'https://throve-production.up.railway.app'
).replace(/\/$/, '');

export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message: string }).message)
        : `Request failed (${res.status})`;
    const code =
      payload && typeof payload === 'object' && payload !== null && 'code' in payload
        ? String((payload as { code: string }).code)
        : undefined;
    throw new ApiError(message, code, res.status);
  }

  return payload as T;
}

export { API_URL };
