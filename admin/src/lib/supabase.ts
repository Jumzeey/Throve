import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare const __THROVE_SUPABASE_URL__: string;
declare const __THROVE_SUPABASE_ANON_KEY__: string;

const supabaseUrl = (typeof __THROVE_SUPABASE_URL__ !== 'undefined' ? __THROVE_SUPABASE_URL__ : '').trim();
const supabaseAnonKey = (
  typeof __THROVE_SUPABASE_ANON_KEY__ !== 'undefined' ? __THROVE_SUPABASE_ANON_KEY__ : ''
).trim();

/** False until Supabase URL + anon key are present at build time. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Missing Supabase URL / anon key at build time. Staff password login is disabled; use Demo UI.',
  );
}

// Placeholder avoids createClient throwing when env is unset (blank screen on Vercel).
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  },
);
