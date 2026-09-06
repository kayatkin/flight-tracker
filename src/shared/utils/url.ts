import { logError } from './logger';

const TOKEN_PARAMS = ['token', 'startapp', 'tgWebAppStartParam', 'start'] as const;

const stripTokenParams = (params: URLSearchParams): void => {
  TOKEN_PARAMS.forEach((key) => params.delete(key));
};

/** Removes share token from URL (query + hash) without dropping other params. */
export const clearTokenFromUrl = (): void => {
  try {
    const url = new URL(window.location.href);
    stripTokenParams(url.searchParams);

    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      stripTokenParams(hashParams);
      const nextHash = hashParams.toString();
      url.hash = nextHash ? `#${nextHash}` : '';
    }

    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  } catch (error) {
    logError('[URL] Error clearing token from URL:', error);
  }
};
