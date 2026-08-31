import { supabase } from '@/lib/supabase';
import type { EmailOtpType } from '@supabase/supabase-js';

type AuthParams = {
  access_token: string | null;
  refresh_token: string | null;
  code: string | null;
  token_hash: string | null;
  type: string | null;
};

/** Parse tokens/code from a Supabase magic-link redirect URL. */
export function parseAuthRedirectUrl(url: string): AuthParams {
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const params = new URLSearchParams(hash || query);

  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    code: params.get('code'),
    token_hash: params.get('token_hash'),
    type: params.get('type'),
  };
}

/** Exchange a magic-link / OAuth redirect URL for a Supabase session. */
export async function completeAuthFromRedirectUrl(url: string) {
  const { access_token, refresh_token, code, token_hash, type } = parseAuthRedirectUrl(url);

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

  if (token_hash && type) {
    const otpType: EmailOtpType =
      type === 'signup' ? 'signup' : type === 'recovery' ? 'recovery' : 'email';
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    });
    if (error) throw error;
    return;
  }

  throw new Error('This sign-in link is invalid or has expired.');
}
