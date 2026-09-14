import React, { useEffect, useState } from 'react';
import {
  loadIdentities,
  linkEmailAccount,
  refreshOwnerAfterLink,
  summarizeIdentities,
  type AccountIdentity,
} from '@services/accountService';
import { useEscapeToClose } from '@shared/hooks';
import { toast } from '@shared/ui/Toast';
import styles from './AccountModal.module.css';

interface AccountModalProps {
  isTelegram: boolean;
  onClose: () => void;
  onLinked: () => void | Promise<void>;
}

const AccountModal: React.FC<AccountModalProps> = ({ isTelegram, onClose, onLinked }) => {
  const dialogRef = useEscapeToClose<HTMLDivElement>(onClose);
  const [identities, setIdentities] = useState<AccountIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = summarizeIdentities(identities);
  const showLinkForm = !summary.hasEmail;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadIdentities().then((rows) => {
      if (cancelled) return;
      setIdentities(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await linkEmailAccount(email, password, confirmPassword);
      if (!result.ok) {
        setError(result.error ?? 'Не удалось связать аккаунт');
        return;
      }
      if (result.identities) setIdentities(result.identities);
      toast(
        result.needsConfirmation
          ? 'Email привязан. Подтвердите ящик по письму, прежде чем входить в браузере.'
          : 'Аккаунты связаны. История теперь общая.',
        'success'
      );
      await refreshOwnerAfterLink();
      onClose();
      await onLinked();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.modalContent}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        tabIndex={-1}
      >
        <h3 id="account-title">Аккаунт</h3>

        {loading ? (
          <p className={styles.hint}>Загрузка…</p>
        ) : (
          <>
            <ul className={styles.statusList}>
              <li>
                <span className={styles.statusLabel}>Telegram</span>
                <span>{summary.hasTelegram || isTelegram ? 'привязан' : 'не привязан'}</span>
              </li>
              <li>
                <span className={styles.statusLabel}>Email</span>
                <span>{summary.email || (summary.hasEmail ? 'привязан' : 'не привязан')}</span>
              </li>
            </ul>

            {showLinkForm && (
              <>
                <p className={styles.lead}>
                  Привяжите email и пароль — та же история откроется в браузере.
                </p>
                <form className={styles.form} onSubmit={(event) => { void submit(event); }}>
                  <label className={styles.label} htmlFor="account-email">Email</label>
                  <input
                    id="account-email"
                    className={styles.input}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <label className={styles.label} htmlFor="account-password">Пароль</label>
                  <input
                    id="account-password"
                    className={styles.input}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                  <label className={styles.label} htmlFor="account-password-confirm">Повторите пароль</label>
                  <input
                    id="account-password-confirm"
                    className={styles.input}
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                  {error && <p className={styles.error} role="alert">{error}</p>}
                  <button type="submit" className={styles.submit} disabled={busy}>
                    {busy ? 'Привязка…' : 'Привязать email'}
                  </button>
                </form>
                <p className={styles.hint}>
                  Пароль обязателен: так нельзя занять чужой ящик. Новый email нужно
                  подтвердить письмом перед входом в браузере.
                </p>
              </>
            )}

            {!showLinkForm && !summary.hasTelegram && (
              <p className={styles.lead}>
                Откройте Mini App в Telegram и введите этот email с паролем —
                истории объединятся. В браузере Telegram привязать нельзя.
              </p>
            )}

            {!showLinkForm && (summary.hasTelegram || isTelegram) && (
              <p className={styles.lead}>
                Один аккаунт: история общая в Telegram и в браузере.
              </p>
            )}

            {error && !showLinkForm && <p className={styles.error} role="alert">{error}</p>}
          </>
        )}

        <div className={styles.buttonGroup}>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountModal;
