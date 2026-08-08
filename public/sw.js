self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Passive fetch listener to satisfy PWA criteria without aggressive caching on dynamic Firestore data
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (
    url.origin.includes('firestore') ||
    url.origin.includes('firebase') ||
    url.origin.includes('googleapis') ||
    url.pathname.startsWith('/api')
  ) {
    return;
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Casa OAMI', body: 'Você tem uma nova notificação.' };
  
  const options = {
    body: data.body,
    icon: 'https://i.ibb.co/vC49wFB8/a3068c33-2467-4266-a9c3-da7b27dc78b8.jpg',
    badge: 'https://i.ibb.co/vC49wFB8/a3068c33-2467-4266-a9c3-da7b27dc78b8.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});
