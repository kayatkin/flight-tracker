// src/types/shared.ts
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
}

export type AppUser = {
  userId: string;
  name: string;
  isGuest: false;
  isTelegram: boolean;
} | GuestUser;