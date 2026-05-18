import { logError } from './logger';

/** Removes share token from URL (query + hash). */
export const clearTokenFromUrl = (): void => {
  try {
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (error) {
    logError('[URL] Error clearing token from URL:', error);
  }
};
