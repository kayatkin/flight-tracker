import React, { useState, useEffect, useCallback } from 'react';
import { t } from '@shared/i18n';
import { supabase } from '@shared/lib';
import { buildShareUrl } from '@services/shareUrls';
import { copyToClipboard, logError } from '@shared/utils';
import { useEscapeToClose } from '@shared/hooks';
import styles from './SharedSessionsList.module.css';
import { SharedSession } from '@shared/types';
import {
  getInvitationsDisplayText,
  getFilterLabel,
  getFilterDescription,
  type InvitationFilter,
} from '@shared/lib/i18n/invitations';
import { getDaysText } from '@shared/lib/i18n/pluralize';

interface SharedSessionsListProps {
  userId: string;
  onClose: () => void;
  onSessionDeactivated: () => void;
}

// Утилита для форматирования даты
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Получение информации о статусе
const getStatusInfo = (session: SharedSession) => {
  const now = new Date();
  const expiresAt = session.expires_at ? new Date(session.expires_at) : null;

  if (!session.is_active) {
    return { text: t('invites.revoked'), className: styles.statusRevoked };
  }

  if (!expiresAt || expiresAt <= now) {
    return { text: t('invites.expired'), className: styles.statusExpired };
  }

  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return { text: t('invites.expiresToday'), className: styles.statusExpiring };
  } else if (diffDays <= 3) {
    return { 
      text: t('invites.expiresIn', { days: getDaysText(diffDays) }), 
      className: styles.statusExpiring 
    };
  } else {
    return { 
      text: t('invites.activeFor', { days: getDaysText(diffDays) }), 
      className: styles.statusActive 
    };
  }
};

const SharedSessionsList: React.FC<SharedSessionsListProps> = ({
  userId,
  onClose,
  onSessionDeactivated,
}) => {
  const [sessions, setSessions] = useState<SharedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<InvitationFilter>('active');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const dialogRef = useEscapeToClose<HTMLDivElement>(onClose);

  // Загрузка сессий
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('shared_sessions')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const now = new Date();
      const defaultExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const formattedSessions: SharedSession[] = (data || []).map((session) => ({
        id: session.id,
        owner_id: session.owner_id,
        token: session.token ?? null,
        permissions: session.permissions,
        expires_at: session.expires_at ?? defaultExpiresAt,
        created_at: session.created_at,
        is_active: session.is_active,
      }));

      setSessions(formattedSessions);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('errors.unknown');
      setError(message || t('invites.loadError'));
      logError('Error loading shared sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Деактивация сессии
  const deactivateSession = useCallback(
    async (sessionId: string, _token: string) => {
      if (!window.confirm(t('invites.revokeConfirm'))) return;

      try {
        const { error } = await supabase
          .from('shared_sessions')
          .update({ is_active: false })
          .eq('id', sessionId);

        if (error) throw error;

        await loadSessions();
        onSessionDeactivated();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('errors.unknown');
        setError(message || t('invites.revokeError'));
        logError('Error deactivating session:', err);
      }
    },
    [loadSessions, onSessionDeactivated]
  );

  // 🔥 ИСПРАВЛЕНО: Правильная генерация ссылок в зависимости от прав
  const copyToken = useCallback(async (token: string, permissions: 'view' | 'edit') => {
    const url = buildShareUrl(token, permissions);
    const linkType = permissions === 'edit' ? t('invites.telegramType') : t('invites.webType');

    const copied = await copyToClipboard(url);
    if (!copied) {
      logError(`Не удалось скопировать ${linkType}`);
      setError(t('share.copyFailed'));
      return;
    }

    setCopiedToken(token);
    window.setTimeout(() => {
      setCopiedToken(null);
    }, 2000);
  }, []);

  // Фильтрация сессий
  const now = new Date();
  const activeSessions = sessions.filter(
    (s) => s.is_active && s.expires_at && new Date(s.expires_at) > now
  );
  const inactiveSessions = sessions.filter(
    (s) => !s.is_active || (s.expires_at && new Date(s.expires_at) <= now)
  );

  // ИСПРАВЛЕНИЕ: Правильная типизация stats
  const stats: Record<InvitationFilter, number> = {
    all: sessions.length,
    active: activeSessions.length,
    inactive: inactiveSessions.length,
  };

  const getFilteredSessions = () => {
    switch (filter) {
      case 'active':
        return activeSessions;
      case 'inactive':
        return inactiveSessions;
      default:
        return sessions;
    }
  };

  // Получение текста для отображения
  const displayText = getInvitationsDisplayText(stats[filter], filter);
  const filteredSessions = getFilteredSessions();

  // Обработчик клавиатуры для фильтров
  const handleFilterKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    filterKey: InvitationFilter
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFilter(filterKey);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={loading ? undefined : 'shared-sessions-title'}
        aria-label={loading ? t('invites.loadingAria') : undefined}
        tabIndex={-1}
      >
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>{t('invites.loading')}</p>
          </div>
        ) : (
          <>
        <div className={styles.header}>
          <h3 id="shared-sessions-title">{t('invites.title')}</h3>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label={t('invites.close')}
            title={t('invites.close')}
            tabIndex={0}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            ⚠️ {error}
          </div>
        )}

        {copiedToken && (
          <div className={styles.success} role="status">
            {t('invites.copiedClipboard')}
          </div>
        )}

        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h4>{t('invites.emptyTitle')}</h4>
            <p>{t('invites.emptyHint')}</p>
          </div>
        ) : (
          <>
            {/* Переключатели фильтров */}
            <div className={styles.statsContainer} role="tablist">
              {(['all', 'active', 'inactive'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  aria-controls="sessions-list"
                  aria-label={getFilterDescription(stats[key], key)}
                  className={`${styles.statItem} ${
                    filter === key ? styles.statItemActive : ''
                  }`}
                  onClick={() => setFilter(key)}
                  onKeyDown={(e) => handleFilterKeyDown(e, key)}
                  tabIndex={filter === key ? 0 : -1}
                >
                  <span className={styles.statNumber}>{stats[key]}</span>
                  <span className={styles.statLabel}>
                    {getFilterLabel(stats[key], key)}
                  </span>
                </button>
              ))}
            </div>

            {/* Информация о фильтре */}
            <div className={styles.filterInfo}>
              <div 
                className={styles.filterHint}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {displayText.main}
                {displayText.hint && (
                  <span className={styles.filterSubHint}> {displayText.hint}</span>
                )}
              </div>
            </div>

            {/* Список приглашений */}
            {filteredSessions.length === 0 ? (
              <div className={styles.noResults}>
                <div className={styles.noResultsIcon}>🔍</div>
                <p>{t('invites.noFilter')}</p>
                <button 
                  onClick={() => setFilter('all')} 
                  className={styles.showAllButton}
                  aria-label={t('invites.showAllAria')}
                >
                  {t('invites.showAll')}
                </button>
              </div>
            ) : (
              <div 
                className={styles.sessionsList} 
                role="list"
                id="sessions-list"
                aria-label={
                  filter === 'all'
                    ? t('invites.listAll')
                    : filter === 'active'
                      ? t('invites.listActive')
                      : t('invites.listInactive')
                }
              >
                {filteredSessions.map((session) => {
                  const status = getStatusInfo(session);
                  const canCopyLink = Boolean(session.token);
                  const isTokenCopied = Boolean(session.token) && copiedToken === session.token;
                  
                  return (
                    <div 
                      key={session.id} 
                      className={styles.sessionCard} 
                      role="listitem"
                      aria-labelledby={`session-${session.id}-title`}
                    >
                      {/* Верхняя строка - права доступа и статус */}
                      <div className={styles.sessionHeader}>
                        <div className={styles.sessionInfo}>
                          <div
                            id={`session-${session.id}-title`}
                            className={styles.permissionBadge}
                            data-permission={session.permissions}
                            aria-label={
                              session.permissions === 'view'
                                ? t('invites.viewWeb')
                                : t('invites.editTg')
                            }
                          >
                            {session.permissions === 'view'
                              ? t('invites.viewBadge')
                              : t('invites.editBadge')}
                          </div>
                          <div 
                            className={`${styles.status} ${status.className}`}
                            role="status"
                            aria-label={t('invites.status', { text: status.text })}
                          >
                            {status.text}
                          </div>
                        </div>
                      </div>

                      {/* Средняя строка - даты и кнопки действий */}
                      <div className={styles.sessionMiddleRow}>
                        <div className={styles.datesCompact}>
                          <div className={styles.dateCompact}>
                            <span className={styles.dateLabel}>{t('invites.created')}</span>
                            <span>{formatDate(session.created_at)}</span>
                          </div>
                          <div className={styles.dateCompact}>
                            <span className={styles.dateLabel}>{t('invites.expires')}</span>
                            <span>{formatDate(session.expires_at!)}</span>
                          </div>
                        </div>
                        
                        <div className={styles.actionButtonsCompact}>
                          {canCopyLink ? (
                          <button
                            onClick={() => copyToken(session.token as string, session.permissions)}
                            className={`${styles.copyButtonCompact} ${
                              isTokenCopied ? styles.copyButtonCompactActive : ''
                            }`}
                            aria-label={
                              isTokenCopied
                                ? t('invites.copied')
                                : session.permissions === 'edit'
                                  ? t('invites.copyTelegram')
                                  : t('invites.copyWeb')
                            }
                            disabled={!session.is_active}
                            aria-disabled={!session.is_active}
                            title={isTokenCopied
                              ? t('invites.copiedShort')
                              : session.permissions === 'edit'
                                ? t('invites.copyTelegramTitle')
                                : t('invites.copyWebTitle')}
                          >
                            {isTokenCopied ? t('invites.copiedBtn') :
                              session.permissions === 'edit' ? '📱 Telegram' : '🌐 Web'}
                          </button>
                          ) : (
                            <span className={styles.tokenPreview} title={t('invites.shownOnceTitle')}>
                              {t('invites.shownOnce')}
                            </span>
                          )}
                          <button
                            onClick={() => deactivateSession(session.id, session.token ?? '')}
                            className={styles.revokeButtonCompact}
                            aria-label={t('invites.revokeAria')}
                            disabled={!session.is_active}
                            aria-disabled={!session.is_active}
                            title={session.is_active ? t('invites.revokeTitle') : t('invites.alreadyRevoked')}
                          >
                            {t('invites.revoke')}
                          </button>
                        </div>
                      </div>

                      {/* Нижняя строка - идентификатор */}
                      <div className={styles.sessionFooter}>
                        <div className={styles.tokenRow}>
                          <span className={styles.detailLabel}>{t('invites.token')}</span>
                          <span className={styles.tokenPreview} title={session.token ?? undefined}>
                            {session.token ? `${session.token.substring(0, 15)}...` : t('invites.hidden')}
                          </span>
                        </div>
                        <div className={styles.linkTypeHint}>
                          <small>
                            {session.permissions === 'view'
                              ? t('invites.webHint')
                              : t('invites.tgHint')}
                          </small>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.footer}>
              <div className={styles.hint}>
                {t('invites.footerHint')}
              </div>
              <button 
                onClick={onClose} 
                className={styles.closeButtonLarge}
                aria-label={t('invites.closeWindow')}
              >
                {t('invites.close')}
              </button>
            </div>
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default SharedSessionsList;