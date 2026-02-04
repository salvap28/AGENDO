export async function askNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export async function registerPushSubscription(apiBaseUrl: string) {
  if (typeof window === 'undefined') {
    console.log('[registerPushSubscription] Window undefined (SSR)');
    return null;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('[registerPushSubscription] SW or PushManager not available');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('[registerPushSubscription] SW ready:', registration);

    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      console.log('[registerPushSubscription] Using existing subscription:', existingSub.endpoint.substring(0, 50));
      
      // Send existing subscription to backend API (not Next.js API route)
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('agendo_token') : null;
        if (!token) {
          console.warn('[registerPushSubscription] No auth token, skipping backend registration');
          return existingSub;
        }
        
        // Use the API base URL from environment or default
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        if (!apiBase) {
          console.warn('[registerPushSubscription] No API base URL configured');
          return existingSub;
        }
        
        const url = `${apiBase}/api/notifications/subscribe`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: existingSub }),
        });
        
        if (response.ok) {
          console.log('[registerPushSubscription] ✓ Existing subscription sent to backend API');
        } else {
          console.warn('[registerPushSubscription] Failed to send existing subscription:', response.status);
        }
      } catch (err) {
        console.warn('[registerPushSubscription] Failed to send existing subscription:', err);
      }
      
      return existingSub;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('[registerPushSubscription] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY');
      return null;
    }
    console.log('[registerPushSubscription] VAPID key found, subscribing...');

    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    const newSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey as BufferSource,
    });

    console.log('[registerPushSubscription] Push subscription created:', newSub.endpoint.substring(0, 50));

    // Send the subscription to the backend API (not Next.js API route)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('agendo_token') : null;
      if (!token) {
        console.warn('[registerPushSubscription] No auth token, skipping backend registration');
        return newSub;
      }
      
      // Use the API base URL from environment or the provided apiBaseUrl
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || apiBaseUrl;
      if (!apiBase) {
        console.warn('[registerPushSubscription] No API base URL configured');
        return newSub;
      }
      
      const url = `${apiBase}/api/notifications/subscribe`;
      console.log('[registerPushSubscription] Posting to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: newSub }),
      });

      if (!response.ok) {
        console.error('[registerPushSubscription] Subscribe POST failed:', response.status, await response.text());
      } else {
        const data = await response.json();
        console.log('[registerPushSubscription] ✓ Subscription saved to backend API:', data);
      }
    } catch (fetchErr) {
      console.error('[registerPushSubscription] Failed to POST subscription:', fetchErr);
    }

    return newSub;
  } catch (err) {
    console.error('[registerPushSubscription] Error:', err);
    return null;
  }
}

// helper para convertir la clave VAPID a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
