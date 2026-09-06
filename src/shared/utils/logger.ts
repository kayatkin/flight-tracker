import { env } from '../config/env';

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

const SECRET_QUERY = /([?&](?:token|startapp|tgWebAppStartParam|start)=)[^&\s#]+/gi;
const SECRET_SHARE = /share_[a-zA-Z0-9_-]+/gi;

export const redactSecrets = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.replace(SECRET_QUERY, '$1[redacted]').replace(SECRET_SHARE, 'share_[redacted]');
  }

  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
        if (/token|initdata|authorization|secret|apikey/i.test(key)) {
          return [key, '[redacted]'];
        }
        return [key, redactSecrets(nested)];
      })
    );
  }

  return value;
};

const withRedaction =
  (fn: (...args: unknown[]) => void): LogFn =>
  (...args) =>
    fn(...args.map(redactSecrets));

export const devLog: LogFn = env.isDev ? withRedaction(console.log) : noop;
export const devWarn: LogFn = env.isDev ? withRedaction(console.warn) : noop;
export const logError: LogFn = withRedaction(console.error);
