import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// 🔥 BLOQUEIO TOTAL E LIMPEZA DE CACHE PARA ESTABILIDADE
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });

  // 🧹 Limpa caches e força recarregamento se houver nova versão
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}

// Limpa localStorage de versões antigas se necessário
const APP_VERSION = '2.0.1';
if (localStorage.getItem('app_version') !== APP_VERSION) {
  localStorage.clear();
  localStorage.setItem('app_version', APP_VERSION);
}

// 🚫 Bloqueia qualquer novo registro de Service Worker
try {
  (navigator.serviceWorker.register as any) = () => {
    return Promise.resolve({
      active: null,
      installing: null,
      waiting: null,
      onupdatefound: null,
      unregister: () => Promise.resolve(true),
      update: () => Promise.resolve()
    });
  };
} catch (e) {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
