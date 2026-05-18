import { getTokenFromTelegramStartParamFixed } from './telegramUtils';
import { devLog } from './logger';

export const getTokenFromTelegramStartParam = (): string | null => {
  devLog('[TELEGRAM] Extracting token from start params');
  return getTokenFromTelegramStartParamFixed();
};

export const getTokenFromAnywhere = (): string | null =>
  getTokenFromTelegramStartParamFixed();
