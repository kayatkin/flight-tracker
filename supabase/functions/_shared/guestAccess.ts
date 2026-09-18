export type GuestPermission = 'view' | 'edit';

/** Guest rights follow the invite in both the browser and Telegram. */
export function effectiveGuestPermissions(invitePermissions: unknown): GuestPermission {
  return invitePermissions === 'edit' ? 'edit' : 'view';
}
