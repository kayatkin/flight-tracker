import { createClient } from '@supabase/supabase-js';
import { assertEnvConfigured, env } from '../config/env';

assertEnvConfigured();

const supabaseUrl = env.supabaseUrl || 'https://example.invalid.supabase.co';
const supabaseAnonKey = env.supabaseAnonKey || 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
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
