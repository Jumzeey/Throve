import type { AdminRole } from './roles';

const TOKEN_KEY = 'throve-admin-tokens';
const SESSION_KEY = 'throve-admin-session';

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

export function clearStaffSession() {
  writeTokens(null);
  writeStoredStaff(null);
}
