import {
  clearStaffSession,
  readTokens,
  setAuthGateReason,
  writeTokens,
  type AuthGateReason,
} from './session';

declare const __THROVE_API_URL__: string;

const API_URL = (
  typeof __THROVE_API_URL__ !== 'undefined' && __THROVE_API_URL__
    ? __THROVE_API_URL__
    : import.meta.env.VITE_API_URL || 'https://throve-production.up.railway.app'
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

let refreshInFlight: Promise<string | null> | null = null;

function redirectToLogin(reason: AuthGateReason) {
  setAuthGateReason(reason);
  clearStaffSession();
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/login')) return;
  window.location.assign(`/login?reason=${reason}`);
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens?.refreshToken) return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/staff/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!res.ok) {
        let code = 'SESSION_EXPIRED';
        try {
          const body = (await res.json()) as { code?: string };
          if (body.code) code = body.code;
        } catch {
          // ignore
        }
        redirectToLogin(code === 'ACCESS_REVOKED' ? 'revoked' : 'expired');
        return null;
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        expiresAt?: number | null;
      };
      writeTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      });
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function getAccessToken() {
  return readTokens()?.accessToken ?? null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');

  const isPublicAuth =
    path.startsWith('/auth/staff/login') ||
    path.startsWith('/auth/staff/refresh') ||
    path.startsWith('/auth/staff/logout');
  const token = isPublicAuth ? null : getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (err) {
    throw err instanceof TypeError ? err : new TypeError('Network request failed');
  }

  if (!isPublicAuth && res.status === 401 && retry && readTokens()?.refreshToken) {
    const next = await refreshAccessToken();
    if (next) return apiFetch<T>(path, init, false);
  }

  if (!isPublicAuth && res.status === 403) {
    let code: string | undefined;
    try {
      const peek = (await res.clone().json()) as { code?: string };
      code = peek.code;
    } catch {
      // ignore
    }
    if (code === 'ACCESS_REVOKED') {
      redirectToLogin('revoked');
    }
  }

  if (res.status === 204) {
    return null as T;
  }

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

  return (payload ?? null) as T;
}

export { API_URL };
