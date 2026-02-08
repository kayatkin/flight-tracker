import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@shared/lib';
import styles from './SharedSessionsList.module.css';
import { SharedSession } from '@shared/types';
import {
  getInvitationsDisplayText,
  getFilterLabel,
  getFilterDescription,
  type InvitationFilter,
} from 'shared/lib/i18n/invitations';
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
    return { 
      text: `Истекает через ${getDaysText(diffDays)}`, 
      className: styles.statusExpiring 
    };
  } else {
    return { 
      text: `Действует ${getDaysText(diffDays)}`, 
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
        token: session.token,
        permissions: session.permissions,
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

  // Деактивация сессии
  const deactivateSession = useCallback(
    async (sessionId: string, token: string) => {
      if (!window.confirm('Отозвать доступ по этой ссылке?')) return;

      try {
        const { error } = await supabase
          .from('shared_sessions')
          .update({ is_active: false })
          .eq('id', sessionId);

        if (error) throw error;

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

  // 🔥 ИСПРАВЛЕНО: Правильная генерация ссылок в зависимости от прав
  const copyToken = useCallback(async (token: string, permissions: 'view' | 'edit') => {
    let url: string;
    let linkType: string;
    
    if (permissions === 'edit') {
      // Telegram ссылка для редактирования
      url = `https://t.me/my_flight_tracker1_bot?startapp=${token}`;
      linkType = 'Telegram ссылка для редактирования';
    } else {
      // Веб-ссылка для просмотра
      url = `${window.location.origin}${window.location.pathname}?token=${token}`;
      linkType = 'Веб-ссылка для просмотра';
    }
    
    console.log(`[COPY] ${linkType}:`, url);
    
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      
      // Сбрасываем состояние через 2 секунды
      setTimeout(() => {
        setCopiedToken(null);
      }, 2000);
    } catch (err) {
      console.error('Не удалось скопировать ссылку:', err);
      setError('Не удалось скопировать ссылку');
    }
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

  if (loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>Загрузка приглашений...</p>
          </div>
        </div>
      </div>
    );
  }

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
            ✅ Ссылка скопирована в буфер обмена
          </div>
        )}

        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h4>Нет активных приглашений</h4>
            <p>Создайте первое приглашение во вкладке «История»</p>
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
                <p>Нет приглашений по текущему фильтру</p>
                <button 
                  onClick={() => setFilter('all')} 
                  className={styles.showAllButton}
                  aria-label="Перейти к просмотру всех приглашений"
                >
                  Показать все приглашения
                </button>
              </div>
            ) : (
              <div 
                className={styles.sessionsList} 
                role="list"
                id="sessions-list"
                aria-label={`Список ${filter === 'all' ? 'всех' : filter} приглашений`}
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
                      {/* Верхняя строка - права доступа и статус */}
                      <div className={styles.sessionHeader}>
                        <div className={styles.sessionInfo}>
                          <div
                            id={`session-${session.id}-title`}
                            className={styles.permissionBadge}
                            data-permission={session.permissions}
                            aria-label={
                              session.permissions === 'view'
                                ? 'Только просмотр (Web-ссылка)'
                                : 'Редактирование (Telegram-ссылка)'
                            }
                          >
                            {session.permissions === 'view' 
                              ? '👁️ Просмотр' 
                              : '✏️ Редактирование'}
                          </div>
                          <div 
                            className={`${styles.status} ${status.className}`}
                            role="status"
                            aria-label={`Статус: ${status.text}`}
                          >
                            {status.text}
                          </div>
                        </div>
                      </div>

                      {/* Средняя строка - даты и кнопки действий */}
                      <div className={styles.sessionMiddleRow}>
                        <div className={styles.datesCompact}>
                          <div className={styles.dateCompact}>
                            <span className={styles.dateLabel}>Создано:</span>
                            <span>{formatDate(session.created_at)}</span>
                          </div>
                          <div className={styles.dateCompact}>
                            <span className={styles.dateLabel}>Истекает:</span>
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
                                ? 'Ссылка скопирована' 
                                : `Копировать ${session.permissions === 'edit' ? 'Telegram' : 'Web'} ссылку`
                            }
                            disabled={!session.is_active}
                            aria-disabled={!session.is_active}
                            title={isTokenCopied 
                              ? 'Скопировано!' 
                              : `Копировать ${session.permissions === 'edit' ? 'Telegram ссылку для редактирования' : 'Web-ссылку для просмотра'}`}
                          >
                            {isTokenCopied ? '✓ Скопировано' : 
                              session.permissions === 'edit' ? '📱 Telegram' : '🌐 Web'}
                          </button>
                          <button
                            onClick={() => deactivateSession(session.id, session.token)}
                            className={styles.revokeButtonCompact}
                            aria-label="Отозвать доступ по этому приглашению"
                            disabled={!session.is_active}
                            aria-disabled={!session.is_active}
                            title={session.is_active ? 'Отозвать доступ' : 'Доступ уже отозван'}
                          >
                            🔒 Отозвать
                          </button>
                        </div>
                      </div>

                      {/* Нижняя строка - идентификатор */}
                      <div className={styles.sessionFooter}>
                        <div className={styles.tokenRow}>
                          <span className={styles.detailLabel}>Токен:</span>
                          <span className={styles.tokenPreview} title={session.token}>
                            {session.token.substring(0, 15)}...
                          </span>
                        </div>
                        <div className={styles.linkTypeHint}>
                          <small>
                            {session.permissions === 'view' 
                              ? '🌐 Web-ссылка для просмотра в любом браузере' 
                              : '📱 Telegram-ссылка для редактирования в мини-приложении'}
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
                💡 Нажмите «Telegram» или «Web» чтобы скопировать ссылку для соответствующего типа доступа
              </div>
              <button 
                onClick={onClose} 
                className={styles.closeButtonLarge}
                aria-label="Закрыть окно приглашений"
              >
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