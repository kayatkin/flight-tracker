import { createClient } from '@supabase/supabase-js';
import { assertEnvConfigured, env } from '../config/env';

assertEnvConfigured();

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});
