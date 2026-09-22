import type { AdminRole } from './roles';

const TOKEN_KEY = 'throve-admin-tokens';
const SESSION_KEY = 'throve-admin-session';
const AUTH_REASON_KEY = 'throve-admin-auth-reason';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number | null;
};

export type StoredStaff = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
};

export type AuthGateReason = 'expired' | 'revoked';

export function readTokens(): StoredTokens | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: StoredTokens | null) {
  if (!tokens) {
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function readStoredStaff(): StoredStaff | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredStaff;
  } catch {
    return null;
  }
}

export function writeStoredStaff(staff: StoredStaff | null) {
  if (!staff) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(staff));
}

export function setAuthGateReason(reason: AuthGateReason | null) {
  if (!reason) {
    sessionStorage.removeItem(AUTH_REASON_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_REASON_KEY, reason);
}

export function consumeAuthGateReason(): AuthGateReason | null {
  try {
    const raw = sessionStorage.getItem(AUTH_REASON_KEY);
    sessionStorage.removeItem(AUTH_REASON_KEY);
    if (raw === 'expired' || raw === 'revoked') return raw;
    return null;
  } catch {
    return null;
  }
}

export function clearStaffSession() {
  writeTokens(null);
  writeStoredStaff(null);
}
