/**
 * Centralized env access. Supports VITE_* (Vite) and legacy REACT_APP_* (CRA).
 */
const readEnv = (viteKey: string, legacyKey: string): string =>
  (import.meta.env[viteKey] as string | undefined) ??
  (import.meta.env[legacyKey] as string | undefined) ??
  '';

export const env = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL', 'REACT_APP_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY'),
  telegramBotUsername:
    (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) ?? 'my_flight_tracker1_bot',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export const assertEnvConfigured = (): void => {
  if (!env.isDev) return;
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables are not set');
    console.warn('Add to .env.local:');
    console.warn('VITE_SUPABASE_URL=https://your-project.supabase.co');
    console.warn('VITE_SUPABASE_ANON_KEY=your_anon_key_here');
  }
};
