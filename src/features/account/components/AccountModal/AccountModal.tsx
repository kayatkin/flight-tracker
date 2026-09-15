import React, { useEffect, useState } from 'react';
import {
  loadIdentities,
  linkEmailAccount,
  refreshOwnerAfterLink,
  summarizeIdentities,
  type AccountIdentity,
} from '@services/accountService';
import { MIN_NEW_PASSWORD_LENGTH } from '@services/emailAuth';
import { t } from '@shared/i18n';
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
        setError(result.error ?? t('account.linkFailed'));
        return;
      }
      if (result.identities) setIdentities(result.identities);
      toast(
        result.needsConfirmation
          ? t('account.toastConfirm')
          : t('account.toastLinked'),
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
        <h3 id="account-title">{t('account.title')}</h3>

        {loading ? (
          <p className={styles.hint}>{t('account.loading')}</p>
        ) : (
          <>
            <ul className={styles.statusList}>
              <li>
                <span className={styles.statusLabel}>{t('account.telegram')}</span>
                <span>{summary.hasTelegram || isTelegram ? t('account.linked') : t('account.notLinked')}</span>
              </li>
              <li>
                <span className={styles.statusLabel}>{t('account.email')}</span>
                <span>{summary.email || (summary.hasEmail ? t('account.linked') : t('account.notLinked'))}</span>
              </li>
            </ul>

            {showLinkForm && (
              <>
                <p className={styles.lead}>{t('account.leadLink')}</p>
                <form className={styles.form} onSubmit={(event) => { void submit(event); }}>
                  <label className={styles.label} htmlFor="account-email">{t('auth.email')}</label>
                  <input
                    id="account-email"
                    className={styles.input}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <label className={styles.label} htmlFor="account-password">{t('auth.password')}</label>
                  <input
                    id="account-password"
                    className={styles.input}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={MIN_NEW_PASSWORD_LENGTH}
                    required
                  />
                  <label className={styles.label} htmlFor="account-password-confirm">{t('auth.confirmPassword')}</label>
                  <input
                    id="account-password-confirm"
                    className={styles.input}
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={MIN_NEW_PASSWORD_LENGTH}
                    required
                  />
                  {error && <p className={styles.error} role="alert">{error}</p>}
                  <button type="submit" className={styles.submit} disabled={busy}>
                    {busy ? t('account.submitting') : t('account.submit')}
                  </button>
                </form>
                <p className={styles.hint}>{t('account.hint')}</p>
              </>
            )}

            {!showLinkForm && !summary.hasTelegram && (
              <p className={styles.lead}>{t('account.leadTelegram')}</p>
            )}

            {!showLinkForm && (summary.hasTelegram || isTelegram) && (
              <p className={styles.lead}>{t('account.leadDone')}</p>
            )}

            {error && !showLinkForm && <p className={styles.error} role="alert">{error}</p>}
          </>
        )}

        <div className={styles.buttonGroup}>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            {t('account.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountModal;
