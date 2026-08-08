import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// 📱 REGISTRO DE SERVICE WORKER PARA PWA INSTALÁVEL
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Erro ao registrar Service Worker PWA:', err);
    });
  });
}

// Limpa localStorage de versões antigas se necessário
const APP_VERSION = '2.1.0';
if (localStorage.getItem('app_version') !== APP_VERSION) {
  localStorage.setItem('app_version', APP_VERSION);
}

// Global handlers to prevent Firestore internal assertion or quota limits from crashing the UI
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (msg.includes('FIRESTORE') || msg.includes('ASSERTION FAILED') || msg.includes('Quota exceeded') || msg.includes('quota')) {
    event.preventDefault();
    console.warn('Caught Firestore stream exception:', msg);
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason || '');
  if (reason.includes('FIRESTORE') || reason.includes('ASSERTION FAILED') || reason.includes('Quota exceeded') || reason.includes('quota')) {
    event.preventDefault();
    console.warn('Caught unhandled Firestore promise rejection:', reason);
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
