import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';
import { t } from '@shared/i18n';
import { logError } from '@shared/utils';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('[UI] Render crashed:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={styles.wrap} role="alert">
        <p className={styles.title}>{t('crash.title')}</p>
        <p className={styles.copy}>{t('crash.copy')}</p>
        <button
          type="button"
          className={styles.retry}
          onClick={() => window.location.reload()}
        >
          {t('crash.reload')}
        </button>
      </div>
    );
  }
}
