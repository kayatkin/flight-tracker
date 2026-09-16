import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/tokens.css';
import App from './App';
import { DesignPreview } from './preview/DesignPreview';
import { ToastProvider } from '@shared/ui/Toast';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';
import { startPasswordRecoveryWatch } from '@services/authRecovery';

startPasswordRecoveryWatch();

const showDesignPreview =
  import.meta.env.DEV && window.location.hash === '#design-preview';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ErrorBoundary>
        {showDesignPreview ? <DesignPreview /> : <App />}
      </ErrorBoundary>
    </ToastProvider>
  </React.StrictMode>
);