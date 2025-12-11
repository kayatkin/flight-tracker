// src/types/shared.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { TelegramUser } from '../telegram.d';

export interface SharedSession {
  id: string;
  owner_id: string;
  token: string;
  permissions: 'view' | 'edit';
  expires_at?: string;
  created_at: string;
  is_active: boolean;
}

export interface GuestUser {
  userId: string;
  name: string;
  isGuest: true;
  sessionToken: string;
  permissions: 'view' | 'edit';
  ownerId: string;
  ownerName: string;
  telegramUser?: TelegramUser;
}

export interface OwnerUser {
  userId: string;
  name: string;
  isGuest: false;
  isTelegram: boolean;
  telegramUser?: TelegramUser;
}

export type AppUser = OwnerUser | GuestUser;

export interface TokenValidationResult {
  isValid: boolean;
  guestUser?: GuestUser;
  error?: string;
}

export interface CreateSessionParams {
  ownerId: string;
  permissions: 'view' | 'edit';
  expiresInHours: number;
  note?: string;
}