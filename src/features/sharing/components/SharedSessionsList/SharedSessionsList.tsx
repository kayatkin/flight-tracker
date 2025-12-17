// src/features/sharing/components/SharedSessionsList/SharedSessionsList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@shared/lib';
import styles from './SharedSessionsList.module.css';
import { SharedSession } from '@shared/types';

interface SharedSessionsListProps {
  userId: string;
  onClose: () => void;
  onSessionDeactivated: () => void;
}

type SessionFilter = 'all' | 'active' | 'inactive';

// --- ВНЕ КОМПОНЕНТА: чистые утилиты ---
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

const getStatusInfo = (session: SharedSession) => {
  const now = new Date();
  const expiresAt = session.expires_at ? new Date(session.expires_at) : null;

  if (!session.is_active) {
    return { text: 'Отозвано', className: styles.statusRevoked };
  }

  if (!expiresAt || expiresAt <= now) {
    return { text: 'Истекло', className: styles.statusExpired };
  }

  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return { text: 'Истекает сегодня', className: styles.statusExpiring };
  } else if (diffDays <= 3) {
    return { text: `Истекает через ${diffDays} дня`, className: styles.statusExpiring };
  } else {
    return { text: `Действует ${diffDays} дней`, className: styles.statusActive };
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
  const [filter, setFilter] = useState<SessionFilter>('active');

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('shared_sessions')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const defaultExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const formattedSessions: SharedSession[] = (data || []).map((session) => ({
        id: session.id,
        owner_id: session.owner_id,
        token: session.token,
        permissions: session.permissions,
        // Защита от null/undefined
        expires_at: session.expires_at ?? defaultExpiresAt,
        created_at: session.created_at,
        is_active: session.is_active,
      }));

      setSessions(formattedSessions);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message || 'Ошибка загрузки приглашений');
      console.error('Error loading shared sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const deactivateSession = useCallback(
    async (sessionId: string, token: string) => {
      // ⚠️ Лучше заменить window.confirm на UI-модалку
      if (!window.confirm('Отозвать доступ по этой ссылке?')) return;

      try {
        const { error } = await supabase
          .from('shared_sessions')
          .update({ is_active: false })
          .eq('id', sessionId);

        if (error) throw error;

        // ✅ Используем ту же функцию из замыкания
        await loadSessions();
        onSessionDeactivated();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message || 'Ошибка при отзыве доступа');
        console.error('Error deactivating session:', err);
      }
    },
    [loadSessions, onSessionDeactivated]
  );

  // --- Логика фильтрации ---
  const now = new Date();
  const activeSessions = sessions.filter(
    (s) => s.is_active && s.expires_at && new Date(s.expires_at) > now
  );
  const inactiveSessions = sessions.filter(
    (s) => !s.is_active || (s.expires_at && new Date(s.expires_at) <= now)
  );

  const stats = {
    total: sessions.length,
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

  const copyToken = useCallback((token: string) => {
    const url = `${window.location.origin}${window.location.pathname}?token=${token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        // ✅ Лучше показывать тост или состояние "скопировано"
        alert('Ссылка скопирована!');
      })
      .catch((err) => {
        console.error('Не удалось скопировать ссылку:', err);
        setError('Не удалось скопировать ссылку');
      });
  }, []);

  // --- Рендер ---
  if (loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.loading}>Загрузка приглашений...</div>
        </div>
      </div>
    );
  }

  const filteredSessions = getFilteredSessions();

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📋 Выданные приглашения</h3>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Закрыть"
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>📭 Нет активных приглашений</p>
            <p>Создайте первое приглашение во вкладке «История»</p>
          </div>
        ) : (
          <>
            {/* Статистика как переключатели */}
            <div className={styles.statsContainer} role="tablist">
              {(['all', 'active', 'inactive'] as const).map((key) => (
                <div
                  key={key}
                  role="tab"
                  aria-selected={filter === key}
                  className={`${styles.statItem} ${filter === key ? styles.statItemActive : ''}`}
                  onClick={() => setFilter(key)}
                  tabIndex={0}
                  onKeyPress={(e) => e.key === 'Enter' && setFilter(key)}
                >
                  <span className={styles.statNumber}>
                    {key === 'all' ? stats.total : key === 'active' ? stats.active : stats.inactive}
                  </span>
                  <span className={styles.statLabel}>
                    {key === 'all' ? 'Всего' : key === 'active' ? 'Активные' : 'Неактивные'}
                  </span>
                </div>
              ))}
            </div>

            {/* Подсказка по фильтру */}
            <div className={styles.filterInfo}>
              <div className={styles.filterHint}>
                {filter === 'all' && `📋 Показаны все ${stats.total} приглашений`}
                {filter === 'active' && `✅ Показаны ${stats.active} активных приглашений`}
                {filter === 'inactive' &&
                  `👁️ Показаны ${stats.inactive} неактивных приглашений (отозваны или истекли)`}
              </div>
            </div>

            {/* Список приглашений */}
            {filteredSessions.length === 0 ? (
              <div className={styles.noResults}>
                <p>📭 Нет приглашений по текущему фильтру</p>
                <button onClick={() => setFilter('all')} className={styles.showAllButton}>
                  Показать все приглашения
                </button>
              </div>
            ) : (
              <div className={styles.sessionsList} role="list">
                {filteredSessions.map((session) => {
                  const status = getStatusInfo(session);
                  return (
                    <div key={session.id} className={styles.sessionCard} role="listitem">
                      <div className={styles.sessionHeader}>
                        <div className={styles.sessionInfo}>
                          <div
                            className={styles.permissionBadge}
                            data-permission={session.permissions}
                            aria-label={
                              session.permissions === 'view'
                                ? 'Только просмотр'
                                : 'Полный доступ с редактированием'
                            }
                          >
                            {session.permissions === 'view' ? '👁️ Только просмотр' : '✏️ Редактирование'}
                          </div>
                          <div className={`${styles.status} ${status.className}`}>{status.text}</div>
                        </div>
                        <div className={styles.sessionActions}>
                          <button
                            onClick={() => copyToken(session.token)}
                            className={styles.copyButton}
                            title="Копировать ссылку"
                            disabled={!session.is_active}
                            aria-disabled={!session.is_active}
                          >
                            📋
                          </button>
                          <button
                            onClick={() => deactivateSession(session.id, session.token)}
                            className={styles.revokeButton}
                            title="Отозвать доступ"
                            disabled={!session.is_active}
                            aria-disabled={!session.is_active}
                          >
                            🔒
                          </button>
                        </div>
                      </div>

                      <div className={styles.sessionDetails}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Создано:</span>
                          <span>{formatDate(session.created_at)}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Истекает:</span>
                          <span>{formatDate(session.expires_at!)}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Токен:</span>
                          <span className={styles.tokenPreview}>
                            {session.token.substring(0, 15)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.footer}>
              <div className={styles.hint}>
                💡 Нажмите 📋 чтобы скопировать ссылку, 🔒 чтобы отозвать доступ
              </div>
              <button onClick={onClose} className={styles.closeButtonLarge}>
                Закрыть
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SharedSessionsList;