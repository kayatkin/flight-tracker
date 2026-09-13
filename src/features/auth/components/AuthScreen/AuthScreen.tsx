import React, { useState } from 'react';
import { env } from '@shared/config/env';
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
        const result = await updatePassword(password);
        if (!result.ok) {
          setError(result.error ?? 'Не удалось сохранить пароль');
          return;
        }
        await onAuthenticated();
        return;
      }

      if (mode === 'forgot') {
        const result = await requestPasswordReset(email);
        if (!result.ok) {
          setError(result.error ?? 'Не удалось отправить письмо');
          return;
        }
        setInfo('Если аккаунт есть, отправили ссылку для сброса пароля.');
        return;
      }

      const result = mode === 'register'
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (!result.ok) {
        setError(result.error ?? 'Не удалось войти');
        return;
      }
      if (result.needsConfirmation) {
        setInfo('Проверьте почту и подтвердите регистрацию, затем войдите.');
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
        setError('Dev-вход выключен. Включите ALLOW_DEV_AUTH или войдите по email.');
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
        <h2 className={styles.title}>✈️ Flight Tracker</h2>
        <p className={styles.lead}>Задайте новый пароль для входа по email.</p>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.label} htmlFor="auth-password">Новый пароль</label>
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
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={styles.submit} disabled={busy}>
            Сохранить пароль
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <p className={styles.lead}>
        Войдите по email, чтобы пользоваться приложением в браузере без Telegram.
      </p>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode !== 'forgot' && mode === 'login'}
          className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
          onClick={() => { setMode('login'); setError(null); setInfo(null); }}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
          onClick={() => { setMode('register'); setError(null); setInfo(null); }}
        >
          Регистрация
        </button>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label} htmlFor="auth-email">Email</label>
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
            <label className={styles.label} htmlFor="auth-password">Пароль</label>
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
            ? 'Отправить ссылку'
            : mode === 'register'
              ? 'Создать аккаунт'
              : 'Войти'}
        </button>
      </form>

      {mode !== 'forgot' ? (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => { setMode('forgot'); setError(null); setInfo(null); }}
        >
          Забыли пароль?
        </button>
      ) : (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => { setMode('login'); setError(null); setInfo(null); }}
        >
          Назад ко входу
        </button>
      )}

      {env.isDev && (
        <button
          type="button"
          className={styles.devButton}
          onClick={() => { void continueAsDeveloper(); }}
          disabled={busy}
        >
          Войти как разработчик
        </button>
      )}

      <p className={styles.hint}>
        Mini App в Telegram работает как раньше: этот экран только для браузера.
      </p>
    </div>
  );
};

export default AuthScreen;
