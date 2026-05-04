import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// 🔥 BLOQUEIO TOTAL DO SERVICE WORKER
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });

  // 🚫 Bloqueia qualquer novo registro de Service Worker para evitar cache stale
  try {
    (navigator.serviceWorker.register as any) = () => {
      console.log('✅ Service Worker propositalmente bloqueado para estabilidade.');
      return Promise.resolve({
        active: null,
        installing: null,
        waiting: null,
        onupdatefound: null,
        pushManager: null as any,
        scope: '',
        unregister: () => Promise.resolve(true),
        update: () => Promise.resolve()
      });
    };
  } catch (e) {
    console.warn('Não foi possível bloquear SW register:', e);
  }

  // 🧹 Limpa todos os caches
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}

// ✅ ESSA PARTE NÃO PODE APAGAR
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
