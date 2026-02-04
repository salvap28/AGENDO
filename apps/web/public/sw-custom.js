// Agendo Push Notification Handlers
// This file is imported by the main service worker and handles push events

console.log('[Agendo Push] Custom push handler loaded');

self.addEventListener('push', (event) => {
  console.log('[Agendo Push] Push event received:', event);

  let notificationData = {
    title: 'Agendo',
    body: 'Notificación',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'agendo-notification',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
      // Support 'message' as alias for 'body'
      if (data.message && !data.body) {
        notificationData.body = data.message;
      }
      console.log('[Agendo Push] Parsed data:', data);
    } catch (e) {
      const text = event.data.text();
      notificationData.body = text;
      console.log('[Agendo Push] Using text:', text);
    }
  }

  console.log('[Agendo Push] Showing notification:', notificationData);

  const showPromise = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: true,  // Keep notification longer
    data: { url: '/' },
    vibrate: [200, 100, 200],  // Vibration pattern
  });

  event.waitUntil(
    showPromise
      .then(() => {
        console.log('[Agendo Push] ✓ Notification shown successfully');
      })
      .catch((err) => {
        console.error('[Agendo Push] ✗ Failed to show notification:', err);
        // Fallback: try again
        return self.registration.showNotification('Agendo', {
          body: 'Tienes una notificación de Agendo',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'agendo-notification-fallback',
        }).then(() => {
          console.log('[Agendo Push] ✓ Fallback notification shown');
        });
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Agendo Push] Notification clicked:', event.notification.tag);
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      console.log('[Agendo Push] Found clients:', clientList.length);
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        console.log('[Agendo Push] Client URL:', client.url);
        if (client.url.includes('/') && 'focus' in client) {
          console.log('[Agendo Push] Focusing existing client');
          return client.focus();
        }
      }
      if (clients.openWindow) {
        console.log('[Agendo Push] Opening new window');
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[Agendo Push] Notification closed:', event.notification.tag);
});
