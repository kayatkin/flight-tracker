import { effectiveGuestPermissions } from './guestAccess.ts';

Deno.test('guest rights follow the invite, including after a previous view session', () => {
  if (effectiveGuestPermissions('edit') !== 'edit') {
    throw new Error('edit invite must grant edit in browser and Telegram');
  }
  if (effectiveGuestPermissions('view') !== 'view') {
    throw new Error('view invite must stay view');
  }
  if (effectiveGuestPermissions('other') !== 'view') {
    throw new Error('unknown invite must not escalate');
  }
});
