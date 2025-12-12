// Только исправляем ошибки TypeScript, но логику оставляем как есть
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from './SharedSessionsList.module.css';
import { SharedSession } from '../types/shared';

interface SharedSessionsListProps {
  userId: string;
  onClose: () => void;
  onSessionDeactivated: () => void;
}

type SessionFilter = 'all' | 'active';

const SharedSessionsList: React.FC<SharedSessionsListProps> = ({ 
  userId, 
  onClose,
  onSessionDeactivated 
}) => {
  const [sessions, setSessions] = useState<SharedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<SessionFilter>('active');

  useEffect(() => {
    loadSessions();
  }, [userId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shared_sessions')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Гарантируем, что expires_at всегда есть (поскольку у нас вариант А)
      const formattedSessions: SharedSession[] = (data || []).map(session => ({
        id: session.id,
        owner_id: session.owner_id,
        token: session.token,
        permissions: session.permissions,
        expires_at: session.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Дефолтное значение если вдруг нет
        created_at: session.created_at,
        is_active: session.is_active
      }));
      
      setSessions(formattedSessions);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки приглашений');
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const deactivateSession = async (sessionId: string, token: string) => {
    if (!window.confirm('Отозвать доступ по этой ссылке?')) return;

    try {
      const { error } = await supabase
        .from('shared_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;
      
      alert('Доступ отозван');
      loadSessions();
      onSessionDeactivated();
    } catch (err: any) {
      setError(err.message || 'Ошибка при отзыве доступа');
    }
  };

  // Получение отфильтрованных приглашений
  const getFilteredSessions = () => {
    const now = new Date();
    
    switch (filter) {
      case 'active':
        return sessions.filter(session => 
          session.is_active && 
          new Date(session.expires_at!) > now // Используем ! так как expires_at всегда есть
        );
      case 'all':
      default:
        return sessions;
    }
  };

  // Получение статистики
  const getSessionStats = () => {
    const now = new Date();
    
    const activeSessions = sessions.filter(session => 
      session.is_active && 
      new Date(session.expires_at!) > now
    );
    
    const expiredSessions = sessions.filter(session => 
      session.is_active && 
      new Date(session.expires_at!) <= now
    );
    
    const revokedSessions = sessions.filter(session => !session.is_active);
    
    return {
      total: sessions.length,
      active: activeSessions.length,
      expired: expiredSessions.length,
      revoked: revokedSessions.length,
      inactive: expiredSessions.length + revokedSessions.length
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (session: SharedSession) => {
    const now = new Date();
    
    if (!session.is_active) {
      return { text: 'Отозвано', className: styles.statusRevoked };
    }
    
    // В варианте А expires_at всегда есть
    const expires = new Date(session.expires_at!);
    
    if (expires < now) {
      return { text: 'Истекло', className: styles.statusExpired };
    }
    
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      return { text: 'Истекает сегодня', className: styles.statusExpiring };
    } else if (diffDays <= 3) {
      return { text: `Истекает через ${diffDays} дня`, className: styles.statusExpiring };
    } else {
      return { text: `Действует ${diffDays} дней`, className: styles.statusActive };
    }
  };

  const copyToken = (token: string) => {
    const url = `${window.location.origin}${window.location.pathname}?token=${token}`;
    navigator.clipboard.writeText(url)
      .then(() => alert('Ссылка скопирована!'))
      .catch(err => console.error('Copy failed:', err));
  };

  if (loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div className={styles.loading}>Загрузка приглашений...</div>
        </div>
      </div>
    );
  }

  const filteredSessions = getFilteredSessions();
  const stats = getSessionStats();

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📋 Выданные приглашения</h3>
          <button onClick={onClose} className={styles.closeButton} title="Закрыть">
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
            {/* Кнопки фильтрации */}
            <div className={styles.filterButtons}>
              <button
                onClick={() => setFilter('all')}
                className={`${styles.filterButton} ${filter === 'all' ? styles.filterButtonActive : ''}`}
                data-count={stats.total}
              >
                Все приглашения
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`${styles.filterButton} ${filter === 'active' ? styles.filterButtonActive : ''}`}
                data-count={stats.active}
              >
                Активные
              </button>
            </div>

            {/* Информация о фильтре */}
            {filter === 'active' && stats.inactive > 0 && (
              <div className={styles.filterInfo}>
                <div className={styles.filterHint}>
                  <span>👁️ Скрыто {stats.inactive} приглашений (отозваны или истекли)</span>
                </div>
              </div>
            )}

            {/* Статистика */}
            <div className={styles.stats}>
              <div className={`${styles.statItem} ${filter === 'all' ? styles.statItemActive : ''}`}>
                <span className={styles.statNumber}>{stats.total}</span>
                <span className={styles.statLabel}>Всего</span>
              </div>
              <div className={`${styles.statItem} ${filter === 'active' ? styles.statItemActive : ''}`}>
                <span className={styles.statNumber}>{stats.active}</span>
                <span className={styles.statLabel}>Активные</span>
              </div>
              <div className={styles.statItem}>
                <span className={`${styles.statNumber} ${styles.statNumberInactive}`}>
                  {stats.inactive}
                </span>
                <span className={styles.statLabel}>Неактивные</span>
              </div>
            </div>

            {/* Список приглашений */}
            {filteredSessions.length === 0 ? (
              <div className={styles.noResults}>
                <p>📭 Нет приглашений по текущему фильтру</p>
                {filter === 'active' && (
                  <button 
                    onClick={() => setFilter('all')}
                    className={styles.showAllButton}
                  >
                    Показать все приглашения
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.sessionsList}>
                {filteredSessions.map((session) => {
                  const status = getStatusInfo(session);
                  return (
                    <div key={session.id} className={styles.sessionCard}>
                      <div className={styles.sessionHeader}>
                        <div className={styles.sessionInfo}>
                          <div 
                            className={styles.permissionBadge}
                            data-permission={session.permissions}
                          >
                            {session.permissions === 'view' ? '👁️ Только просмотр' : '✏️ Редактирование'}
                          </div>
                          <div className={`${styles.status} ${status.className}`}>
                            {status.text}
                          </div>
                        </div>
                        <div className={styles.sessionActions}>
                          <button
                            onClick={() => copyToken(session.token)}
                            className={styles.copyButton}
                            title="Копировать ссылку"
                            disabled={!session.is_active}
                          >
                            📋
                          </button>
                          <button
                            onClick={() => deactivateSession(session.id, session.token)}
                            className={styles.revokeButton}
                            title="Отозвать доступ"
                            disabled={!session.is_active}
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