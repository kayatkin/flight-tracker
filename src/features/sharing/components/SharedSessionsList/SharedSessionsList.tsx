import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@shared/lib';
import styles from './SharedSessionsList.module.css';
import { SharedSession } from '@shared/types';

interface SharedSessionsListProps {
  userId: string;
  onClose: () => void;
  onSessionDeactivated: () => void;
}

type InvitationFilter = 'all' | 'active' | 'expired' | 'revoked';

const FILTER_KEYS: Record<InvitationFilter, string> = {
  all: 'invites.filterAll',
  active: 'invites.filterActive',
  expired: 'invites.filterExpired',
  revoked: 'invites.filterRevoked',
};

const SharedSessionsList: React.FC<SharedSessionsListProps> = ({
  userId,
  onClose,
  onSessionDeactivated,
}) => {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<SharedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<InvitationFilter>('active');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ru-RU';

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [dateLocale]);

  const getStatusInfo = useCallback((session: SharedSession) => {
    const now = new Date();
    const expiresAt = session.expires_at ? new Date(session.expires_at) : null;

    if (!session.is_active) {
      return { text: t('invites.statusRevoked'), className: styles.statusRevoked };
    }

    if (!expiresAt || expiresAt <= now) {
      return { text: t('invites.statusExpired'), className: styles.statusExpired };
    }

    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysText = t('invites.days', { count: diffDays });

    if (diffDays <= 1) {
      return { text: t('invites.statusExpiresToday'), className: styles.statusExpiring };
    } else if (diffDays <= 3) {
      return {
        text: t('invites.statusExpiresIn', { days: daysText }),
        className: styles.statusExpiring,
      };
    } else {
      return {
        text: t('invites.statusValidFor', { days: daysText }),
        className: styles.statusActive,
      };
    }
  }, [t]);

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
        token: session.token,
        permissions: session.permissions,
        expires_at: session.expires_at ?? defaultExpiresAt,
        created_at: session.created_at,
        is_active: session.is_active,
      }));

      setSessions(formattedSessions);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.unknownError');
      setError(message || t('invites.loadError'));
      console.error('Error loading shared sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const deactivateSession = useCallback(
    async (sessionId: string) => {
      if (!window.confirm(t('invites.revokeConfirm'))) return;

      try {
        const { error: updateError } = await supabase
          .from('shared_sessions')
          .update({ is_active: false })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        await loadSessions();
        onSessionDeactivated();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common.unknownError');
        setError(message || t('invites.revokeError'));
        console.error('Error deactivating session:', err);
      }
    },
    [loadSessions, onSessionDeactivated, t]
  );

  const copyToken = useCallback(async (token: string, permissions: 'view' | 'edit') => {
    const url = permissions === 'edit'
      ? `https://t.me/my_flight_tracker1_bot?startapp=${token}`
      : `${window.location.origin}${window.location.pathname}?token=${token}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);

      setTimeout(() => {
        setCopiedToken(null);
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setError(t('invites.copyError'));
    }
  }, [t]);

  const now = new Date();
  const activeSessions = sessions.filter(
    (s) => s.is_active && s.expires_at && new Date(s.expires_at) > now
  );
  const expiredSessions = sessions.filter(
    (s) => s.is_active && s.expires_at && new Date(s.expires_at) <= now
  );
  const revokedSessions = sessions.filter((s) => !s.is_active);

  const stats: Record<InvitationFilter, number> = {
    all: sessions.length,
    active: activeSessions.length,
    expired: expiredSessions.length,
    revoked: revokedSessions.length,
  };

  const getFilteredSessions = () => {
    switch (filter) {
      case 'active':
        return activeSessions;
      case 'expired':
        return expiredSessions;
      case 'revoked':
        return revokedSessions;
      default:
        return sessions;
    }
  };

  const filteredSessions = getFilteredSessions();

  const handleFilterKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    filterKey: InvitationFilter
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFilter(filterKey);
    }
  };

  if (loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>{t('invites.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📋 {t('invites.title')}</h3>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label={t('common.close')}
            title={t('common.close')}
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
            ✅ {t('invites.copied')}
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
            <div className={styles.statsContainer} role="tablist">
              {(['all', 'active', 'expired', 'revoked'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  aria-controls="sessions-list"
                  aria-label={`${stats[key]} ${t(FILTER_KEYS[key])}`}
                  className={`${styles.statItem} ${
                    filter === key ? styles.statItemActive : ''
                  }`}
                  onClick={() => setFilter(key)}
                  onKeyDown={(e) => handleFilterKeyDown(e, key)}
                  tabIndex={filter === key ? 0 : -1}
                >
                  <span className={styles.statNumber}>{stats[key]}</span>
                  <span className={styles.statLabel}>
                    {t(FILTER_KEYS[key])}
                  </span>
                </button>
              ))}
            </div>

            {filteredSessions.length === 0 ? (
              <div className={styles.noResults}>
                <div className={styles.noResultsIcon}>🔍</div>
                <p>{t('invites.noFilterMatch')}</p>
                <button 
                  onClick={() => setFilter('all')} 
                  className={styles.showAllButton}
                  aria-label={t('invites.showAll')}
                >
                  {t('invites.showAll')}
                </button>
              </div>
            ) : (
              <div 
                className={styles.sessionsList} 
                role="list"
                id="sessions-list"
                aria-label={t(FILTER_KEYS[filter])}
              >
                {filteredSessions.map((session) => {
                  const status = getStatusInfo(session);
                  const isTokenCopied = copiedToken === session.token;
                  
                  return (
                    <div 
                      key={session.id} 
                      className={styles.sessionCard} 
                      role="listitem"
                      aria-labelledby={`session-${session.id}-title`}
                    >
                      <div className={styles.sessionHeader}>
                        <div className={styles.sessionInfo}>
                          <div
                            id={`session-${session.id}-title`}
                            className={styles.permissionBadge}
                            data-permission={session.permissions}
                            aria-label={
                              session.permissions === 'view'
                                ? t('invites.permissionViewWeb')
                                : t('invites.permissionEditTg')
                            }
                          >
                            {session.permissions === 'view' 
                              ? `👁️ ${t('invites.viewShort')}` 
                              : `✏️ ${t('invites.editShort')}`}
                          </div>
                          <div 
                            className={`${styles.status} ${status.className}`}
                            role="status"
                            aria-label={status.text}
                          >
                            {status.text}
                          </div>
                        </div>
                      </div>

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
                          <button
                            onClick={() => copyToken(session.token, session.permissions)}
                            className={`${styles.copyButtonCompact} ${
                              isTokenCopied ? styles.copyButtonCompactActive : ''
                            }`}
                            aria-label={
                              isTokenCopied 
                                ? t('invites.copyCopied')
                                : session.permissions === 'edit'
                                  ? t('invites.copyTg')
                                  : t('invites.copyWeb')
                            }
                            disabled={!session.is_active}
                            aria-disabled={!session.is_active}
                            title={isTokenCopied 
                              ? t('invites.copyCopied')
                              : session.permissions === 'edit'
                                ? t('invites.copyTg')
                                : t('invites.copyWeb')}
                          >
                            {isTokenCopied ? `✓ ${t('invites.copyCopied')}` : 
                              session.permissions === 'edit' ? '📱 Telegram' : '🌐 Web'}
                          </button>
                          <button
                            onClick={() => deactivateSession(session.id)}
                            className={styles.revokeButtonCompact}
                            aria-label={t('invites.revokeTitle')}
                            disabled={!session.is_active}
                            aria-disabled={!session.is_active}
                            title={session.is_active ? t('invites.revoke') : t('invites.statusRevoked')}
                          >
                            🔒 {t('invites.revoke')}
                          </button>
                        </div>
                      </div>

                      <div className={styles.sessionFooter}>
                        <div className={styles.tokenRow}>
                          <span className={styles.detailLabel}>{t('invites.token')}</span>
                          <span className={styles.tokenPreview} title={session.token}>
                            {session.token.substring(0, 15)}...
                          </span>
                        </div>
                        <div className={styles.linkTypeHint}>
                          <small>
                            {session.permissions === 'view' 
                              ? `🌐 ${t('invites.hintWeb')}` 
                              : `📱 ${t('invites.hintTg')}`}
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
                💡 {t('invites.footerHint')}
              </div>
              <button 
                onClick={onClose} 
                className={styles.closeButtonLarge}
                aria-label={t('common.close')}
              >
                {t('common.close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SharedSessionsList;
