import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/tokens.css';
import App from './App';
import { ToastProvider } from '@shared/ui/Toast';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);