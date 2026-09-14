import { supabase } from '@shared/lib';
import {
  isRecoveryCallback,
  parseAuthCallbackParams,
  stripAuthCallbackFromUrl,
} from './emailAuth';

const FLAG_KEY = 'flight-tracker:password-recovery';

let pending = false;
const listeners = new Set<() => void>();

const readStoredFlag = (): boolean => {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(FLAG_KEY) === '1';
};

export const isPasswordRecoveryPending = (): boolean => pending || readStoredFlag();

export const markPasswordRecovery = (): void => {
  pending = true;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(FLAG_KEY, '1');
  }
  listeners.forEach((listener) => listener());
};

export const clearPasswordRecovery = (): void => {
  pending = false;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(FLAG_KEY);
  }
};

export const subscribePasswordRecovery = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (isPasswordRecoveryPending()) listener();
  return () => {
    listeners.delete(listener);
  };
};

export const consumeAuthCallback = async (href?: string): Promise<void> => {
  const params = parseAuthCallbackParams(href);
  if (params.error || params.error_description) {
    stripAuthCallbackFromUrl();
    return;
  }

  if (params.token_hash && isRecoveryCallback(params)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: 'recovery',
    });
    stripAuthCallbackFromUrl();
    if (!error) markPasswordRecovery();
    return;
  }

  if (isRecoveryCallback(params) && params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    stripAuthCallbackFromUrl();
    if (!error) markPasswordRecovery();
    return;
  }

  if (isRecoveryCallback(params)) {
    markPasswordRecovery();
  }
};

let watching = false;

export const startPasswordRecoveryWatch = (): void => {
  if (watching) return;
  watching = true;

  const params = parseAuthCallbackParams();
  if (readStoredFlag()) {
    markPasswordRecovery();
  } else if (isRecoveryCallback(params) && !params.token_hash && !params.access_token) {
    markPasswordRecovery();
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      markPasswordRecovery();
    }
  });

  void consumeAuthCallback();
};

export const resetPasswordRecoveryForTests = (): void => {
  pending = false;
  watching = false;
  listeners.clear();
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(FLAG_KEY);
  }
};
