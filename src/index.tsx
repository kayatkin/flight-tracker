import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/tokens.css';
import App from './App';
import { ToastProvider } from '@shared/ui/Toast';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ToastProvider>
  </React.StrictMode>
);