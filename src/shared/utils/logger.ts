import { env } from '../config/env';

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const devLog: LogFn = env.isDev ? (...args) => console.log(...args) : noop;
export const devWarn: LogFn = env.isDev ? (...args) => console.warn(...args) : noop;
export const logError: LogFn = (...args) => console.error(...args);
