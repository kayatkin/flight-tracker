import { createClient } from '@supabase/supabase-js';
import { assertEnvConfigured, env } from '../config/env';

assertEnvConfigured();

let appAccessToken: string | null = null;

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  accessToken: async () => appAccessToken,
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

export const setSupabaseAccessToken = (accessToken: string | null): void => {
  appAccessToken = accessToken;
  supabase.realtime.setAuth(accessToken ?? env.supabaseAnonKey);
};
