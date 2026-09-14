import React, { useState } from 'react';
import { env } from '@shared/config/env';
import { t } from '@shared/i18n';
import {
  requestPasswordReset,
  signInAsDeveloper,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
} from '@services/authService';
import styles from './AuthScreen.module.css';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthScreenProps {
  onAuthenticated: () => void | Promise<void>;
  recoveryMode?: boolean;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  recoveryMode = false,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (recoveryMode) {
        if (password !== confirmPassword) {
          setError(t('auth.mismatch'));
          return;
        }
        const result = await updatePassword(password);
        if (!result.ok) {
          setError(result.error ?? t('auth.saveFailed'));
          return;
        }
        await onAuthenticated();
        return;
      }

      if (mode === 'forgot') {
        const result = await requestPasswordReset(email);
        if (!result.ok) {
          setError(result.error ?? t('auth.sendFailed'));
          return;
        }
        setInfo(t('auth.forgotHint'));
        return;
      }

      const result = mode === 'register'
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (!result.ok) {
        setError(result.error ?? t('auth.loginFailed'));
        return;
      }
      if (result.needsConfirmation) {
        setInfo(t('auth.confirmHint'));
        setMode('login');
        return;
      }
      await onAuthenticated();
    } finally {
      setBusy(false);
    }
  };

  const continueAsDeveloper = async () => {
    setError(null);
    setBusy(true);
    try {
      const owner = await signInAsDeveloper();
      if (!owner) {
        setError(t('auth.devDisabled'));
        return;
      }
      await onAuthenticated();
    } finally {
      setBusy(false);
    }
  };

  if (recoveryMode) {
    return (
      <div className={styles.screen}>
        <h2 className={styles.title}>{t('app.title')}</h2>
        <p className={styles.lead}>{t('auth.recoveryLead')}</p>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.label} htmlFor="auth-password">{t('auth.newPassword')}</label>
          <input
            id="auth-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
          <label className={styles.label} htmlFor="auth-password-confirm">{t('auth.confirmPassword')}</label>
          <input
            id="auth-password-confirm"
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
            {t('auth.submitRecovery')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>{t('app.title')}</h2>
      <p className={styles.lead}>{t('auth.lead')}</p>

      {mode !== 'forgot' && (
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
          onClick={() => { setMode('login'); setError(null); setInfo(null); }}
        >
          {t('auth.tabLogin')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
          onClick={() => { setMode('register'); setError(null); setInfo(null); }}
        >
          {t('auth.tabRegister')}
        </button>
      </div>
      )}

      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label} htmlFor="auth-email">{t('auth.email')}</label>
        <input
          id="auth-email"
          className={styles.input}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        {mode !== 'forgot' && (
          <>
            <label className={styles.label} htmlFor="auth-password">{t('auth.password')}</label>
            <input
              id="auth-password"
              className={styles.input}
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}
        {info && <p className={styles.info} role="status">{info}</p>}

        <button type="submit" className={styles.submit} disabled={busy}>
          {mode === 'forgot'
            ? t('auth.submitForgot')
            : mode === 'register'
              ? t('auth.submitRegister')
              : t('auth.submitLogin')}
        </button>
      </form>

      {mode !== 'forgot' ? (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => { setMode('forgot'); setError(null); setInfo(null); }}
        >
          {t('auth.forgot')}
        </button>
      ) : (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => { setMode('login'); setError(null); setInfo(null); }}
        >
          {t('auth.backToLogin')}
        </button>
      )}

      {env.isDev && (
        <button
          type="button"
          className={styles.devButton}
          onClick={() => { void continueAsDeveloper(); }}
          disabled={busy}
        >
          {t('auth.devLogin')}
        </button>
      )}

      <p className={styles.hint}>{t('auth.hint')}</p>
    </div>
  );
};

export default AuthScreen;
