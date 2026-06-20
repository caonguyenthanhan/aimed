self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    }),
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Nhắc nhở từ AIMed', body: 'Đã đến giờ bài tập hành vi của bạn rồi!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Nhắc nhở từ AIMed', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/placeholder-logo.png',
    badge: '/placeholder-logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
