import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';           // Импорт index.css
import './styles/tokens.css';   // Дополнительный импорт токенов
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();