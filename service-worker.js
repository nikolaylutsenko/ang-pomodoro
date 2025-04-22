self.addEventListener('notificationclick', function(event) {
  if (event.action === 'startNextInterval') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/' && 'focus' in client) {
            client.postMessage({ action: 'startNextInterval' });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/').then(windowClient => {
            windowClient.postMessage({ action: 'startNextInterval' });
          });
        }
      })
    );
  }
});