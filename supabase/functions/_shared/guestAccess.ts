export type GuestPermission = 'view' | 'edit';

/** Invite capability AND what this refresh family was issued with. Demotion sticks. */
export function effectiveGuestPermissions(
  invitePermissions: unknown,
  issuedPermissions: unknown,
): GuestPermission {
  return invitePermissions === 'edit' && issuedPermissions === 'edit' ? 'edit' : 'view';
}

/**
 * First Telegram id to bind an edit invite wins.
 * `claimedBind` is true when UPDATE … WHERE bound IS NULL returned a row.
 */
export function decideEditBind(params: {
  telegramId: string;
  existingBoundId: string;
  claimedBind: boolean;
  winnerBoundId?: string;
}): GuestPermission {
  if (!params.telegramId) return 'view';
  if (params.existingBoundId) {
    return params.existingBoundId === params.telegramId ? 'edit' : 'view';
  }
  if (params.claimedBind) return 'edit';
  const winner = params.winnerBoundId ?? '';
  return winner === params.telegramId ? 'edit' : 'view';
}
