import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 🔥 BLOQUEIO TOTAL DO SERVICE WORKER
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });

  // 🚫 Bloqueia qualquer novo registro
  navigator.serviceWorker.register = () => {
    console.log('Service Worker bloqueado');
    return Promise.resolve();
  };

  // 🧹 Limpa todos os caches
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}

// ✅ ESSA PARTE NÃO PODE APAGAR
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);