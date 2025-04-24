self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  const notification = event.notification;
  const action = event.action;
  // Use self.location.origin which should be like 'http://localhost:4200'
  const appBaseUrl = self.location.origin;
  // Define the target URL more specifically if needed, e.g., appBaseUrl + '/'
  const targetUrl = appBaseUrl + '/'; // Adjust if your app's main page isn't at the root

  notification.close(); // Close the notification

  // Handle specific actions if needed
  if (action === 'startNextInterval') {
    console.log('[SW] Action "startNextInterval" triggered.');
    // Send message to clients
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        // Post message to all relevant clients
        client.postMessage({ action: 'startNextInterval' });
      });
    });
  }

  // --- Focus/Open Logic ---
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      console.log(`[SW] Found ${clientList.length} client windows.`);

      // 1. Try to find and focus a VISIBLE client matching the target URL
      for (const client of clientList) {
        console.log(`[SW] Checking client: URL=${client.url}, Visible=${client.visibilityState}`);
        // Check if URL starts with the app's origin/base URL and if it's visible
        if (client.url.startsWith(targetUrl) && client.visibilityState === 'visible' && 'focus' in client) {
          console.log('[SW] Found VISIBLE matching client. Attempting focus...');
          return client.focus().then(
            () => console.log('[SW] Focus on visible client successful.'),
            (err) => console.error('[SW] Focus on visible client failed:', err)
          );
        }
      }

      // 2. If no visible client found, try to focus ANY matching client
      for (const client of clientList) {
        if (client.url.startsWith(targetUrl) && 'focus' in client) {
          console.log('[SW] Found ANY matching client (not necessarily visible). Attempting focus...');
          return client.focus().then(
            () => console.log('[SW] Focus on any matching client successful.'),
            (err) => console.error('[SW] Focus on any matching client failed:', err)
          );
        }
      }

      // 3. If no matching client found, open a new window
      if (clients.openWindow) {
        console.log('[SW] No matching client found. Attempting to open new window to:', targetUrl);
        return clients.openWindow(targetUrl).then(
          (newClient) => console.log('[SW] Opened new window:', newClient ? newClient.url : 'Success, but no client info returned.'),
          (err) => console.error('[SW] Open window failed:', err)
        );
      }

      console.log('[SW] Could not focus or open a window (clients.openWindow not supported?).');
      return Promise.resolve(); // Resolve the waitUntil promise if nothing else worked

    }).catch(error => {
      console.error('[SW] Error during clients.matchAll or subsequent promise:', error);
      // Fallback: try opening window directly
      if (clients.openWindow) {
        console.log('[SW] Fallback: Attempting to open new window to:', targetUrl);
        return clients.openWindow(targetUrl).catch(err => console.error('[SW] Fallback open window failed:', err));
      }
      return Promise.resolve(); // Resolve if fallback also fails
    })
  );
});