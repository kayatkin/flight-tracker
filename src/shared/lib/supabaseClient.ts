// src/shared/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Используем переменные окружения
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Проверка в development
if (process.env.NODE_ENV === 'development') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables are not set');
    console.warn('Please create .env.local file with:');
    console.warn('REACT_APP_SUPABASE_URL=https://iptnzxnbcrxczcowjead.supabase.co');
    console.warn('REACT_APP_SUPABASE_ANON_KEY=your_key_here');
  } else {
    console.log('✅ Supabase configured from environment variables');
  }
}

// Создаем клиент для браузера
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

// Упрощенная версия для сервера (если нужна)
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (process.env.NODE_ENV === 'development' && !serviceKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  
  return createClient(supabaseUrl, serviceKey);
};