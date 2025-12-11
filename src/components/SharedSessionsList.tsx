// src/components/SharedSessionsList.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from './SharedSessionsList.module.css';

interface SharedSession {
  id: string;
  token: string;
  permissions: 'view' | 'edit';
  expires_at: string;
  created_at: string;
  is_active: boolean;
}

interface SharedSessionsListProps {
  userId: string;
  onClose: () => void;
  onSessionDeactivated: () => void;
}

const SharedSessionsList: React.FC<SharedSessionsListProps> = ({ 
  userId, 
  onClose,
  onSessionDeactivated 
}) => {
  const [sessions, setSessions] = useState<SharedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
      setSessions(data || []);
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
    const expires = new Date(session.expires_at);
    
    if (!session.is_active) {
      return { text: 'Отозвано', className: styles.statusRevoked };
    }
    
    if (expires < now) {
      return { text: 'Истекло', className: styles.statusExpired };
    }
    
    // Вычисляем сколько дней осталось
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
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{sessions.length}</span>
                <span className={styles.statLabel}>Всего приглашений</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>
                  {sessions.filter(s => s.is_active && new Date(s.expires_at) > new Date()).length}
                </span>
                <span className={styles.statLabel}>Активные</span>
              </div>
            </div>

            <div className={styles.sessionsList}>
              {sessions.map((session) => {
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
                        <span>{formatDate(session.expires_at)}</span>
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