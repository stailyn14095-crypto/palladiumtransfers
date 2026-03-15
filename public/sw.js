self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nueva Notificación';
  const options = {
    body: data.body || 'Tienes un nuevo aviso de Palladium Transfers.',
    icon: '/logo.png', // Ensure this exists or use a generic icon
    badge: '/logo.png',
    data: data.url || '/',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
