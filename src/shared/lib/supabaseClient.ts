// src/shared/lib/supabaseClient.ts - ВРЕМЕННЫЙ ФАЙЛ
import { createClient } from '@supabase/supabase-js';

// ПРЯМОЕ указание значений для быстрого старта
const supabaseUrl = 'https://iptnzxnbcrxczcowjead.supabase.co';
const supabaseAnonKey = 'sb_publishable_IOYZlluZXw65w6DNSrA89Q_BL6PUVEF';

console.log('✅ Using direct Supabase configuration');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

// Упрощенная версия для сервера
export const getServiceSupabase = () => {
  return createClient(
    'https://iptnzxnbcrxczcowjead.supabase.co',
    'sb_secret_IxZdpJsfWUo3ZvkUUcIhhw_NqMp9sc5'
  );
};