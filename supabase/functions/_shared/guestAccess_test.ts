import { decideEditBind, effectiveGuestPermissions } from './guestAccess.ts';

Deno.test('refresh keeps demotion even if the invite is still edit', () => {
  if (effectiveGuestPermissions('edit', 'view') !== 'view') {
    throw new Error('demoted guest must stay view');
  }
  if (effectiveGuestPermissions('edit', 'edit') !== 'edit') {
    throw new Error('bound editor must stay edit');
  }
  if (effectiveGuestPermissions('view', 'edit') !== 'view') {
    throw new Error('view invite must not escalate');
  }
});

Deno.test('first telegram to bind an unbound edit invite wins', () => {
  if (decideEditBind({ telegramId: '1', existingBoundId: '', claimedBind: true }) !== 'edit') {
    throw new Error('winner of bind should get edit');
  }
  if (
    decideEditBind({
      telegramId: '2',
      existingBoundId: '',
      claimedBind: false,
      winnerBoundId: '1',
    }) !== 'view'
  ) {
    throw new Error('loser of bind should get view');
  }
  if (decideEditBind({ telegramId: '1', existingBoundId: '1', claimedBind: false }) !== 'edit') {
    throw new Error('already bound self should keep edit');
  }
  if (decideEditBind({ telegramId: '2', existingBoundId: '1', claimedBind: false }) !== 'view') {
    throw new Error('other telegram must be view');
  }
});
