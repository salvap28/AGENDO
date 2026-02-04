'use client';

// Inject push notification handling into the service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.active) {
        // Send a message to the active SW to load the push handler
        reg.active.postMessage({ type: 'LOAD_PUSH_HANDLER' });
        console.log('[SW Injector] Injected push handler into active SW');
      }
    } catch (e) {
      console.error('[SW Injector] Error:', e);
    }
  });
}
