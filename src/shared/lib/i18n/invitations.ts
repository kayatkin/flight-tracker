// src/shared/lib/i18n/invitations.ts
import { pluralizeWithCount } from './pluralize';

export type InvitationFilter = 'all' | 'active' | 'inactive';

const INVITATION_PHRASES = {
  all: {
    one: '📋 Показано {{count}} приглашение',
    few: '📋 Показаны все {{count}} приглашения',
    many: '📋 Показаны все {{count}} приглашений',
  },
  active: {
    one: '✅ Показано {{count}} активное приглашение',
    few: '✅ Показаны {{count}} активных приглашения',
    many: '✅ Показаны {{count}} активных приглашений',
  },
  inactive: {
    one: '👁️ Показано {{count}} неактивное приглашение',
    few: '👁️ Показаны {{count}} неактивных приглашения',
    many: '👁️ Показаны {{count}} неактивных приглашений',
  },
} as const;

const INVITATION_HINTS = {
  inactive: {
    one: '(отозвано или истекло)',
    few: '(отозваны или истекли)',
    many: '(отозваны или истекли)',
  },
} as const;

export const getInvitationsDisplayText = (
  count: number,
  filter: InvitationFilter
): { main: string; hint?: string } => {
  const mainText = pluralizeWithCount(count, INVITATION_PHRASES[filter]);
  
  if (filter === 'inactive') {
    const hintText = pluralizeWithCount(count, INVITATION_HINTS.inactive);
    return { main: mainText, hint: hintText };
  }
  
  return { main: mainText };
};

// ИСПРАВЛЕНИЕ: Убрали число из скобок
export const getFilterLabel = (
  count: number,
  filter: InvitationFilter
): string => {
  const baseLabels = {
    all: 'Всего',
    active: 'Активные',
    inactive: 'Неактивные',
  };
  
  return baseLabels[filter]; // Только название, без (2)
};

export const getFilterDescription = (
  count: number,
  filter: InvitationFilter
): string => {
  const forms = {
    one: `${count} ${filter === 'all' ? 'приглашение' : filter === 'active' ? 'активное приглашение' : 'неактивное приглашение'}`,
    few: `${count} ${filter === 'all' ? 'приглашения' : filter === 'active' ? 'активных приглашения' : 'неактивных приглашения'}`,
    many: `${count} ${filter === 'all' ? 'приглашений' : filter === 'active' ? 'активных приглашений' : 'неактивных приглашений'}`,
  };
  
  return pluralizeWithCount(count, forms);
};