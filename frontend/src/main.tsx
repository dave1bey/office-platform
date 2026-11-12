import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n/i18n';

// Register PWA Service Worker for Mobile Add-to-Home-Screen (FR-EP-01)
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        reg.update();
        console.log('PWA ServiceWorker registered with scope:', reg.scope);
      },
      (err) => console.log('PWA ServiceWorker registration failed:', err)
    );
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
