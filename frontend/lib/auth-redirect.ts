import { supabase } from '@/lib/supabase';
import type { EmailOtpType } from '@supabase/supabase-js';

type AuthParams = {
  access_token: string | null;
  refresh_token: string | null;
  code: string | null;
  token_hash: string | null;
  token: string | null;
  type: string | null;
};

const OTP_TYPES = new Set<string>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

function toOtpType(type: string | null): EmailOtpType {
  if (type && OTP_TYPES.has(type)) return type as EmailOtpType;
  return 'email';
}

/** Parse tokens/code from a Supabase magic-link redirect URL. */
export function parseAuthRedirectUrl(url: string): AuthParams {
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  // Prefer hash tokens (implicit flow), fall back to query (token_hash / PKCE).
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(query);

  return {
    access_token: hashParams.get('access_token') ?? queryParams.get('access_token'),
    refresh_token: hashParams.get('refresh_token') ?? queryParams.get('refresh_token'),
    code: hashParams.get('code') ?? queryParams.get('code'),
    token_hash: hashParams.get('token_hash') ?? queryParams.get('token_hash'),
    token: hashParams.get('token') ?? queryParams.get('token'),
    type: hashParams.get('type') ?? queryParams.get('type'),
  };
}

/** Exchange a magic-link / OAuth redirect URL for a Supabase session. */
export async function completeAuthFromRedirectUrl(url: string) {
  const { access_token, refresh_token, code, token_hash, token, type } = parseAuthRedirectUrl(url);

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const otpType = toOtpType(type);

  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    });
    if (error) throw error;
    return;
  }

  // Raw Supabase /verify links sometimes land in the app with ?token=...
  if (token) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: otpType,
    });
    if (error) throw error;
    return;
  }

  throw new Error('This sign-in link is invalid or has expired.');
}
